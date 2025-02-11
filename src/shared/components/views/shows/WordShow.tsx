import React, { ReactElement, useState, useEffect } from 'react';
import { ShowProps, useShowController } from 'react-admin';
import { Box, Heading, Skeleton } from '@chakra-ui/react';
import diff from 'deep-diff';
import ReactAudioPlayer from 'react-audio-player';
import {
  EditDocumentTopBar,
  ShowDocumentStats,
  EditDocumentIds,
  Comments,
} from '../components';
import { DEFAULT_RECORD } from '../../../constants';
import View from '../../../constants/Views';
import Collection from '../../../constants/Collections';
import WordClass from '../../../constants/WordClass';
import { getWord } from '../../../API';
import { determineDate } from '../utils';
import DialectDiff from './diffFields/DialectDiff';
import DiffField from './diffFields/DiffField';
import ArrayDiffField from './diffFields/ArrayDiffField';
import ExampleDiff from './diffFields/ExampleDiff';
import CompleteWordPreview from '../../CompleteWordPreview';

const DIFF_FILTER_KEYS = [
  'id',
  'approvals',
  'denials',
  'merged',
  'author',
  'authorId',
  'authorEmail',
  'userComments',
  'editorsNotes',
  'originalWordId',
  'id',
  'updatedOn',
  'stems',
  'normalized',
  'mergedBy',
];

const WordShow = (props: ShowProps): ReactElement => {
  const [isLoading, setIsLoading] = useState(true);
  const [originalWordRecord, setOriginalWordRecord] = useState({});
  const [diffRecord, setDiffRecord] = useState(null);
  const showProps = useShowController(props);
  const { resource } = showProps;
  let { record } = showProps;
  const { permissions } = props;

  record = record || DEFAULT_RECORD;

  const {
    id,
    author,
    word,
    wordClass,
    approvals,
    denials,
    editorsNotes,
    userComments,
    isStandardIgbo,
    merged,
    pronunciation,
    originalWordId,
    updatedOn,
  } = record;

  const resourceTitle = {
    wordSuggestions: 'Word Suggestion',
    genericWords: 'Generic Word',
    words: 'Word',
  };

  const ArrayDiff = (
    { recordField, value, index }:
    { recordField: string, value: any, index: number },
  ): ReactElement => (
    <DiffField
      path={`${recordField}.${index}`}
      diffRecord={diffRecord}
      fallbackValue={value}
    />
  );

  /* Grabs the original word if it exists */
  useEffect(() => {
    (async () => {
      const originalWord = record?.originalWordId ? await getWord(record.originalWordId) : null;
      const differenceRecord = diff(originalWord, record, (_, key) => DIFF_FILTER_KEYS.indexOf(key) > -1);
      setOriginalWordRecord(originalWord);
      setDiffRecord(differenceRecord);
      setIsLoading(false);
    })();
  }, [record]);

  return (
    <Skeleton isLoaded={!isLoading}>
      <Box className="bg-white shadow-sm p-10 mt-10">
        <EditDocumentTopBar
          record={record}
          resource={resource}
          view={View.SHOW}
          id={id}
          permissions={permissions}
          title={`${resourceTitle[resource]} Document Details`}
        />
        <Box className="flex flex-col-reverse lg:flex-row mt-1">
          <Box className="flex flex-col flex-auto justify-between items-start">
            <Box className="w-full flex flex-col lg:flex-row justify-between items-center">
              <Box>
                <Heading fontSize="lg" className="text-xl text-gray-700">
                  {'Last Updated: '}
                  {determineDate(updatedOn)}
                </Heading>
                <EditDocumentIds collection="words" originalId={originalWordId} id={id} title="Origin Word Id:" />
              </Box>
              <CompleteWordPreview record={record} className="my-5 lg:my-0" />
            </Box>
            <Box className="flex flex-col lg:flex-row w-full justify-between">
              <Box>
                <Heading fontSize="lg" className="text-xl text-gray-600">Is Standard Igbo</Heading>
                <DiffField
                  path="isStandardIgbo"
                  diffRecord={diffRecord}
                  fallbackValue={isStandardIgbo}
                  renderNestedObject={(value) => <span>{String(value)}</span>}
                />
                <Box className="flex flex-col mt-5">
                  <Heading fontSize="lg" className="text-xl text-gray-600">Word</Heading>
                  <DiffField
                    path="word"
                    diffRecord={diffRecord}
                    fallbackValue={word}
                  />
                </Box>
                <Box className="flex flex-col mt-5">
                  <Heading fontSize="lg" className="text-xl text-gray-600">Audio Pronunciation</Heading>
                  {/* TODO: check this part! */}
                  <DiffField
                    path="word"
                    diffRecord={diffRecord}
                    fallbackValue={pronunciation ? (
                      <ReactAudioPlayer
                        src={pronunciation}
                        style={{ height: 40, width: 250 }}
                        controls
                      />
                    ) : <span>No audio pronunciation</span>}
                    renderNestedObject={() => (
                      <ReactAudioPlayer
                        src={pronunciation}
                        style={{ height: 40, width: 250 }}
                        controls
                      />
                    )}
                  />
                </Box>
                <Box className="flex flex-col mt-5">
                  <Heading fontSize="lg" className="text-xl text-gray-600">Part of Speech</Heading>
                  <DiffField
                    path="wordClass"
                    diffRecord={diffRecord}
                    fallbackValue={WordClass[wordClass]?.label || `${wordClass} [UPDATE PART OF SPEECH]`}
                  />
                </Box>
                <Box className="flex flex-col mt-5">
                  <Heading fontSize="lg" className="text-xl text-gray-600">Definitions</Heading>
                  {/* @ts-ignore */}
                  <ArrayDiffField
                    recordField="definitions"
                    recordFieldSingular="definition"
                    record={record}
                    // @ts-ignore
                    originalWordRecord={originalWordRecord}
                  >
                    {/* @ts-ignore */}
                    <ArrayDiff recordField="definitions" />
                  </ArrayDiffField>
                </Box>
                <Box className="flex flex-col mt-5">
                  <Heading fontSize="lg" className="text-xl text-gray-600">Variations</Heading>
                  {/* @ts-ignore */}
                  <ArrayDiffField
                    recordField="variations"
                    recordFieldSingular="variation"
                    record={record}
                    // @ts-ignore
                    originalWordRecord={originalWordRecord}
                  >
                    {/* @ts-ignore */}
                    <ArrayDiff recordField="variations" />
                  </ArrayDiffField>
                </Box>
                <Box className="flex flex-col mt-5">
                  <Heading fontSize="lg" className="text-xl text-gray-600">Word Stems</Heading>
                  {/* @ts-ignore */}
                  <ArrayDiffField
                    recordField="stems"
                    recordFieldSingular="stem"
                    record={record}
                    // @ts-ignore
                    originalWordRecord={originalWordRecord}
                  >
                    {/* @ts-ignore */}
                    <ArrayDiff recordField="stems" />
                  </ArrayDiffField>
                </Box>
                <Box className="flex flex-col mt-5">
                  <Heading fontSize="lg" className="text-xl text-gray-600">Examples</Heading>
                  {/* @ts-ignore */}
                  <ArrayDiffField
                    recordField="examples"
                    recordFieldSingular="example"
                    record={record}
                    // @ts-ignore
                    originalWordRecord={originalWordRecord}
                  >
                    {/* @ts-ignore */}
                    <ExampleDiff
                      diffRecord={diffRecord}
                      // @ts-ignore
                      resource={resource}
                    />
                  </ArrayDiffField>
                </Box>
                {resource !== Collection.WORDS ? (
                  <Comments editorsNotes={editorsNotes} userComments={userComments} />
                ) : null}
              </Box>
              <Box className="flex flex-col mt-5">
                <Heading fontSize="lg" className="text-xl text-gray-600">Dialects</Heading>
                <DialectDiff
                  record={record}
                  diffRecord={diffRecord}
                  resource={resource}
                />
              </Box>
            </Box>
          </Box>
          {resource !== Collection.WORDS && (
            <Box className="mb-10 lg:mb-0">
              <ShowDocumentStats
                approvals={approvals}
                denials={denials}
                merged={merged}
                author={author}
                collection="words"
              />
            </Box>
          )}
        </Box>
      </Box>
    </Skeleton>
  );
};

export default WordShow;
