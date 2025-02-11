import React, { ReactElement } from 'react';
import { Record } from 'react-admin';
import DiffField from './DiffField';

const ExampleDiff = ({
  value,
  index,
  diffRecord,
  resource,
} : {
  value: any,
  index: number,
  diffRecord: Record,
  resource: string,
}): ReactElement => (
  <div className="flex flex-row items-end space-x-4">
    <div className="flex flex-col">
      <DiffField
        path={`examples.${index}.igbo`}
        diffRecord={diffRecord}
        fallbackValue={value.igbo}
      />
      <DiffField
        path={`examples.${index}.english`}
        diffRecord={diffRecord}
        fallbackValue={value.english}
      />
    </div>
    <a
      className="link"
      href={`#/${resource === 'words' ? 'examples' : 'exampleSuggestions'}/${value.id}/show`}
    >
      Link to Example
    </a>
  </div>
);

export default ExampleDiff;
