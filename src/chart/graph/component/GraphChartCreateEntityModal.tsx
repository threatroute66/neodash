import { GraphChartVisualizationProps } from '../GraphChartVisualization';
import React from 'react';
import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Button from '@mui/material/Button';
import { Badge, IconButton } from '@material-ui/core';
import { Fab, TextField, Typography } from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import { Autocomplete } from '@material-ui/lab';
import CloseIcon from '@material-ui/icons/Close';
import PlayArrow from '@material-ui/icons/PlayArrow';
import { LabelTypeAutocomplete } from './autocomplete/LabelTypeAutocomplete';
import { DeletePropertyButton } from './button/modal/DeletePropertyButton';
import { handleRelationshipCreate } from '../util/GraphUtils';
import { PropertyNameAutocomplete } from './autocomplete/PropertyNameAutocomplete';

interface ExtendedGraphChartVisualizationProps extends GraphChartVisualizationProps {
  selectedNode: any;
  dialogOpen: any;
  setDialogOpen: any;
}

export const GraphChartCreateModal = (props: ExtendedGraphChartVisualizationProps) => {
  const action = 'Create'; // 'Create', 'Edit', 'Delete'
  const type = 'Relationship'; // 'Node', 'Relationship'
  const [properties, setProperties] = React.useState([{ name: '', value: '' }]);
  const [labelRecords, setLabelRecords] = React.useState([]);
  const [labelInputText, setLabelInputText] = React.useState('');
  const [propertyRecords, setPropertyRecords] = React.useState([]);
  const [propertyInputTexts, setPropertyInputTexts] = React.useState({});
  const [relType, setRelType] = React.useState(undefined);
  return (
    <Dialog
      maxWidth={'lg'}
      open={props.dialogOpen}
      onClose={() => {
        props.setDialogOpen(false);
      }}
      aria-labelledby='form-dialog-title'
    >
      <DialogTitle id='form-dialog-title'>
        {action} a {type}
        <IconButton
          onClick={() => {
            props.interactivity.setContextMenuOpen(false);
            props.setDialogOpen(false);
            setProperties([{ name: '', value: '' }]);
          }}
          style={{ marginLeft: '40px', padding: '3px', float: 'right' }}
        >
          <Badge overlap='rectangular' badgeContent={''}>
            <CloseIcon />
          </Badge>
        </IconButton>
      </DialogTitle>

      <DialogContent style={{ minWidth: '300px' }}>
        <DialogContentText>
          <LabelTypeAutocomplete
            records={labelRecords}
            setRecords={setLabelRecords}
            value={relType}
            setValue={setRelType}
            queryCallback={props.engine.queryCallback}
            type={type}
            input={labelInputText}
            setInput={setLabelInputText}
          />
          <h4>Properties</h4>
          <table>
            {properties.map((property, index) => {
              return (
                <>
                  <tr style={{ height: 40 }}>
                    <td style={{ paddingLeft: '2px', paddingRight: '2px' }}>
                      <span style={{ color: 'black', width: '50px' }}>{index + 1}.</span>
                    </td>
                    <td style={{ paddingLeft: '5px', paddingRight: '5px' }}>
                      <PropertyNameAutocomplete
                        records={propertyRecords}
                        setRecords={setPropertyRecords}
                        values={properties}
                        setValues={setProperties}
                        queryCallback={props.engine.queryCallback}
                        index={index}
                        inputs={propertyInputTexts}
                        setInputs={setPropertyInputTexts}
                      />
                    </td>
                    <td style={{ paddingLeft: '5px', paddingRight: '5px' }}>
                      <TextField
                        style={{ width: '100%' }}
                        placeholder='Value...'
                        value={property.value}
                        onChange={(e) => {
                          const newProperties = [...properties];
                          newProperties[index].value = e.target.value;
                          setProperties(newProperties);
                        }}
                      ></TextField>
                    </td>
                    <td>
                      <DeletePropertyButton
                        onClick={() => {
                          setProperties([...properties.slice(0, index), ...properties.slice(index + 1)]);
                        }}
                      />
                    </td>
                  </tr>
                </>
              );
            })}

            <tr>
              <td style={{ minWidth: '450px' }} colSpan={4}>
                <Typography variant='h3' color='primary' style={{ textAlign: 'center', marginBottom: '5px' }}>
                  <Fab
                    size='small'
                    aria-label='add'
                    style={{ background: 'white', color: 'black' }}
                    onClick={() => {
                      const newProperty = { name: '', value: '' };
                      setProperties(properties.concat(newProperty));
                    }}
                  >
                    <AddIcon />
                  </Fab>
                </Typography>
              </td>
            </tr>
          </table>

          <Button
            style={{ marginBottom: '10px' }}
            disabled={relType === undefined}
            onClick={() => {
              const newProperties = {
                name: relType,
                pending: true,
              };

              properties.map((prop) => {
                if (prop.name !== '' && prop.value !== '') {
                  newProperties[prop.name] = prop.value;
                }
              });

              handleRelationshipCreate(
                props.interactivity.selectedEntity,
                relType,
                newProperties,
                props.selectedNode,
                props.engine,
                props.interactivity,
                props.data
              );
              props.setDialogOpen(false);
              setProperties([{ name: '', value: '' }]);
            }}
            style={{ float: 'right', marginBottom: 15 }}
            variant='contained'
            size='medium'
            endIcon={<PlayArrow />}
          >
            Create
          </Button>
        </DialogContentText>
      </DialogContent>
    </Dialog>
  );
};
