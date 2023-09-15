import React, { useState } from 'react';
import { connect } from 'react-redux';
import { getModelExamples } from '../../state/QueryTranslatorSelector';
import { Dialog } from '@neo4j-ndl/react';
import { Button } from '@neo4j-ndl/react';
import { deleteModelExample, updateModelExample } from '../../state/QueryTranslatorActions';
import ExampleEditorModal from './ExampleEditorModal';
import ExampleDisplayTable from './ExampleDisplayTable';

const QueryTranslatorSettingsModelExamples = ({
  handleCloseEditSolutions,
  examples,
  open,
  handleCloseWithoutSave,
  deleteModelExample,
}) => {

  // States
  const [exampleEditorIsOpen, setExampleEditorIsOpen] = useState(false);
  const [index, setIndex] = useState<number | null>(0);

  // Function for edit button being pressed
  const handleEdit = (index: number) => {
    setIndex(index);
    setExampleEditorIsOpen(true);
  };

  // Function for AddQ&A button being pressed
  const handleAdd = () => {
    setIndex(null);
    setExampleEditorIsOpen(true);
  };

  // Returns viewer or editor depending on exampleEditorIsOpen state
  if (!exampleEditorIsOpen) {
    return (
      <Dialog size='large' open={open} onClose={handleCloseWithoutSave} aria-labelledby='form-dialog-title'>
        <Dialog.Header id='form-dialog-title'>Questions & Answers</Dialog.Header>
        <Dialog.Content>
          <ExampleDisplayTable examples={examples} deleteModelExample={deleteModelExample} handleEdit={handleEdit} />
          <div>
            <Button className='n-float-left' onClick={handleAdd}>Add Q&A</Button>
            <Button className='n-float-right' onClick={handleCloseEditSolutions}>Back</Button>
          </div>
        </Dialog.Content>
      </Dialog>
    );
  }
  return (
    <ExampleEditorModal
      index={index}
      //checks if index exists, and if it does, it passes the question and answer props over to the component, otherwise is empty
      question={index !== null && examples[index].question ? examples[index].question : ''}
      answer={index !== null && examples[index].answer ? examples[index].answer : ''}
      exampleEditorIsOpen={exampleEditorIsOpen}
      setExampleEditorIsOpen={setExampleEditorIsOpen}
    ></ExampleEditorModal>
  );
};

// Function to access the state and pass to the component some parameters
const mapStateToProps = (state) => ({
  examples: getModelExamples(state),
});

// Function to launch an action to modify the state
const mapDispatchToProps = (dispatch) => ({
  deleteModelExample: (index) => dispatch(deleteModelExample(index)),
  updateModelExample: (index, question, answer) => dispatch(updateModelExample(index, question, answer)),
});

export default connect(mapStateToProps, mapDispatchToProps)(QueryTranslatorSettingsModelExamples);
