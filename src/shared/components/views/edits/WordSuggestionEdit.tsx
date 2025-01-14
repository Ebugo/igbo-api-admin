import React, { ReactElement } from 'react';
import { useEditController } from 'react-admin';
import View from '../../../constants/Views';
import Collections from '../../../constants/Collections';
import { HistoryProps } from '../../../interfaces';
import {
  WordEditForm,
  EditDocumentStats,
  EditDocumentIds,
  EditDocumentTopBar,
} from '../components';

const WordSuggestionEdit = (props: HistoryProps): ReactElement => {
  const { history } = props;
  const {
    resource,
    record,
    save,
    setOnFailure,
  } = useEditController(props);
  const {
    id,
    originalWordId,
    approvals,
    denials,
  } = record || {
    id: null,
    originalWordId: null,
    approvals: [],
    denials: [],
  };
  const isPreExistingSuggestion = history.location?.state?.isPreExistingSuggestion || false;

  // Necessary in order to use the save's onFailure callback
  setOnFailure(() => {});

  return record ? (
    <div className="bg-white shadow-sm p-10 mt-10">
      <EditDocumentTopBar
        record={record}
        resource={resource}
        view={View.EDIT}
        title={resource === 'genericWords' ? 'Edit Generic Word' : 'Edit Word Suggestion'}
        id={id}
      />
      <div className="flex flex-col lg:flex-row flex-auto justify-between items-start lg:items-center">
        <EditDocumentIds collection={Collections.WORDS} originalId={originalWordId} id={id} title="Origin Word Id:" />
        <EditDocumentStats approvals={approvals} denials={denials} />
      </div>
      {record ? (
        <WordEditForm
          view={View.EDIT}
          resource={resource}
          record={record}
          save={save}
          history={history}
          isPreExistingSuggestion={isPreExistingSuggestion}
        />
      ) : null}
    </div>
  ) : null;
};

export default WordSuggestionEdit;
