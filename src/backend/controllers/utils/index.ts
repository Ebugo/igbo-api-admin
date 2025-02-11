import { Document, Query, Model } from 'mongoose';
import { Request, Response } from 'functions/node_modules/@types/express';
import stringSimilarity from 'string-similarity';
import diacriticless from 'diacriticless';
import {
  assign,
  isNaN,
  get,
  map,
  compact,
} from 'lodash';
import removePrefix from '../../shared/utils/removePrefix';
import createQueryRegex from '../../shared/utils/createQueryRegex';
import UserRoles from '../../shared/constants/UserRoles';
import SortingDirections from '../../shared/constants/sortingDirections';
import { findUser } from '../users';
import * as Interfaces from './interfaces';

const DEFAULT_RESPONSE_LIMIT = 10;
const MAX_RESPONSE_LIMIT = 100;

/* Determines if an empty response should be returned
 * if the request comes from an unauthed user in production
 */
const constructRegexQuery = ({ user, searchWord }: { user: Interfaces.FormattedUser, searchWord: string }) => (
  user.role && (
    user.role === UserRoles.EDITOR
    || user.role === UserRoles.MERGER
    || user.role === UserRoles.ADMIN
  )
    ? createQueryRegex(searchWord)
    : searchWord
      ? createQueryRegex(searchWord)
      : /^[.{0,}\n{0,}]/
);

const fallbackUser = {
  uid: 'fallback-firebase-uid',
  id: 'fallback-firebase-uid',
  email: 'fallback@email.com',
  display: 'Fallback Author',
  role: 'editor',
};

/* Given a list of keys, where each key's value is a list of Firebase uids,
 * replace each uid with a user object */
export const populateFirebaseUsers = async (
  doc: { [key: string]: string | number | { [key: string]: string } },
  keys: string[],
): Promise<{ [key: string]: string | number | { [key: string]: string } }> => {
  const docWithPopulateFirebaseUsers = assign(doc);
  await Promise.all(map(keys, async (key) => {
    docWithPopulateFirebaseUsers[key] = await Promise.all(map(compact(docWithPopulateFirebaseUsers[key]), (id) => (
      findUser(id)
        .catch(() => {
          console.warn(`The user with the id ${id} doesn't exist in this database`);
          return fallbackUser;
        })
    )));
  }));
  const res = await findUser(docWithPopulateFirebaseUsers.authorId)
    .catch(() => {
      console.warn(`The user with the id ${docWithPopulateFirebaseUsers.authorId} doesn't exist in this database`);
      return fallbackUser;
    }) || {};
  return assign(doc, { author: res });
};

/* Sorts all the docs based on the provided searchWord */
export const sortDocsBy = (searchWord: string, docs: Interfaces.Word[], key: string): Interfaces.Word[] => (
  docs.sort((prevDoc, nextDoc) => {
    const prevDocValue = get(prevDoc, key);
    const nextDocValue = get(nextDoc, key);
    const prevDocDifference = stringSimilarity.compareTwoStrings(searchWord, diacriticless(prevDocValue)) * 100;
    const nextDocDifference = stringSimilarity.compareTwoStrings(searchWord, diacriticless(nextDocValue)) * 100;
    if (prevDocDifference === nextDocDifference) {
      return 0;
    }
    return prevDocDifference > nextDocDifference ? -1 : 1;
  })
);

/* Validates the provided range */
export const isValidRange = (range: number[]): boolean => {
  if (!Array.isArray(range)) {
    return false;
  }

  /* Invalid range if first element is larger than the second */
  if (range[0] >= range[1]) {
    return false;
  }

  const validRange = range;
  validRange[1] += 1;
  return !(validRange[1] - validRange[0] > MAX_RESPONSE_LIMIT) && !(validRange[1] - validRange[0] < 0);
};

/* Takes both page and range and converts them into appropriate skip and limit */
export const convertToSkipAndLimit = (
  { page, range }:
  { page: number, range: number[] },
): { skip: number, limit: number } => {
  let skip = 0;
  let limit = 10;
  if (isValidRange(range)) {
    [skip] = range;
    limit = range[1] - range[0];
    return { skip, limit };
  }

  if (isNaN(page)) {
    throw new Error('Page is not a number.');
  }
  const calculatedSkip = page * DEFAULT_RESPONSE_LIMIT;
  if (calculatedSkip < 0) {
    throw new Error('Page must be a positive number.');
  }
  return { skip: calculatedSkip, limit };
};

/* Packages the res response with sorting */
export const packageResponse = async ({
  res,
  docs,
  model,
  query,
}: {
  res: Response,
  docs: Document<any>,
  model: Model<Document<any>>,
  query: Query<Document<any> | Document<any>[], Document<any>>
  sort: { key: string, direction: boolean | 'asc' | 'desc' }
}): Promise<Response> => {
  // Not handling sorting to preserve alphabetical order
  const sendDocs = docs;
  const count = await model.countDocuments(query);
  res.setHeader('Content-Range', count);
  return res.send(sendDocs);
};

/* Converts the filter query into a word to be used as the keyword query */
const parseFilter = (
  filter: string | { [key: string]: string } = '{"word": ""}',
  user: { [key: string]: string } = {},
): { [key: string]: string } => {
  try {
    const parsedFilter = typeof filter === 'object' ? filter : JSON.parse(filter) || { word: '' };
    if (parsedFilter.authorId) {
      parsedFilter.authorId = user.uid;
    }
    return parsedFilter;
  } catch {
    throw new Error(`Invalid filter query syntax. Expected: {"word":"filter"}, Received: ${filter}`);
  }
};

/* Parses the ranges query to turn into an array */
const parseRange = (range: string | any): null | any => {
  try {
    if (!range) {
      return null;
    }
    const parsedRange = typeof range === 'object' ? range : JSON.parse(range) || null;
    return parsedRange;
  } catch {
    throw new Error(`Invalid range query syntax. Expected: [x,y], Received: ${range}`);
  }
};

/* Parses out the key and the direction of sorting out into an object */
const parseSortKeys = (sort: string): { key: string, direction: string } | null => {
  try {
    if (sort) {
      const parsedSort = JSON.parse(sort);
      const [key] = parsedSort[0] === 'approvals' || parsedSort[0] === 'denials'
        ? [`${parsedSort[0]}.length`] : parsedSort;
      const direction = parsedSort[1].toLowerCase();
      if (direction.toLowerCase() !== SortingDirections.ASCENDING
        && direction.toLowerCase() !== SortingDirections.DESCENDING) {
        throw new Error('Invalid sorting direction. Valid sorting optons: "asc" or "desc"');
      }
      return {
        key,
        direction,
      };
    }
    return null;
  } catch {
    throw new Error(`Invalid sort query syntax. Expected: [key,direction], Received: ${sort}`);
  }
};

/* Handles all the queries for searching in the database */
export const handleQueries = (
  { query = {}, user = {} }:
  Request<{ query: any, user: any }>, // TODO: create query interface
): any => {
  const {
    keyword = '',
    page: pageQuery = 0,
    range: rangeQuery = '',
    sort: sortQuery,
    filter: filterQuery,
    strict: strictQuery,
  } = query;
  const { word, ...filters } = parseFilter(filterQuery, user);
  const searchWord = removePrefix(keyword || word || '');
  const regexKeyword = constructRegexQuery({ user, searchWord });
  const page = parseInt(pageQuery, 10);
  const range = parseRange(rangeQuery);
  const { skip, limit } = convertToSkipAndLimit({ page, range });
  const sort = parseSortKeys(sortQuery);
  const strict = strictQuery === 'true';
  return {
    searchWord,
    regexKeyword,
    page,
    sort,
    skip,
    limit,
    filters,
    user,
    strict,
  };
};

/* Updates a document's merge property with a document id */
export const updateDocumentMerge = (
  suggestionDoc: Document<Interfaces.WordSuggestion | Interfaces.ExampleSuggestion>,
  originalDocId: string,
  mergedBy = null,
): Promise<Document<Interfaces.WordSuggestion | Interfaces.ExampleSuggestion>> => {
  const updatedSuggestion = assign(suggestionDoc, { merged: originalDocId, mergedBy });
  return updatedSuggestion.save();
};
