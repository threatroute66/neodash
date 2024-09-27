import React, { useEffect } from 'react';
import { DataGrid, GridColumnVisibilityModel } from '@mui/x-data-grid';
import { ChartProps } from '../Chart';
import {
  evaluateRulesOnDict,
  generateClassDefinitionsBasedOnRules,
  useStyleRules,
} from '../../extensions/styling/StyleRuleEvaluator';
import { Tooltip, Snackbar, Stack, ButtonGroup, Popover, Typography } from '@mui/material';
import { downloadCSV } from '../ChartUtils';
import { getRendererForValue, rendererForType, RenderSubValue } from '../../report/ReportRecordProcessing';
import ApiService from '../../utils/apiService';
import { AxiosResponse } from 'axios';

import {
  getRule,
  executeActionRule,
  getPageNumbersAndNamesList,
  performActionOnElement,
} from '../../extensions/advancedcharts/Utils';

import { IconButton } from '@neo4j-ndl/react';
import { CloudArrowDownIconOutline, XMarkIconOutline } from '@neo4j-ndl/react/icons';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import { extensionEnabled } from '../../utils/ReportUtils';
import { getCheckboxes, hasCheckboxes, updateCheckBoxes } from './TableActionsHelper';

const TABLE_HEADER_HEIGHT = 32;
const TABLE_FOOTER_HEIGHT = 62;
const TABLE_ROW_HEIGHT = 52;
const HIDDEN_COLUMN_PREFIX = '__';
const theme = createTheme({
  typography: {
    fontFamily: "'Nunito Sans', sans-serif !important",
    allVariants: { color: 'rgb(var(--palette-neutral-text-default))' },
  },
});
const fallbackRenderer = (value) => {
  return JSON.stringify(value);
};

function renderAsButtonWrapper(renderer) {
  return function renderAsButton(value) {
    const outputValue = renderer(value, true);
    // If there's nothing to be rendered, there's no button needed.
    if (outputValue == '') {
      return <></>;
    }
    return (
      <Button style={{ width: '100%', marginLeft: '5px', marginRight: '5px' }} variant='contained' color='primary'>
        {outputValue}
      </Button>
    );
  };
}

function ApplyColumnType(column, value, asAction) {
  const renderer = getRendererForValue(value);
  const renderCell = asAction ? renderAsButtonWrapper(renderer.renderValue) : renderer.renderValue;
  const columnProperties = renderer
    ? { type: renderer.type, renderCell: renderCell ? renderCell : fallbackRenderer }
    : rendererForType.string;
  if (columnProperties) {
    column = { ...column, ...columnProperties };
  }
  return column;
}

export const generateSafeColumnKey = (key) => {
  return key != 'id' ? key : `${key} `;
};

export const NeoTableChart = (props: ChartProps) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);
  const id = open ? 'simple-popover' : undefined;
  const [isApiLoading, setApiLoading] = React.useState(false);
  const transposed = props.settings && props.settings.transposed ? props.settings.transposed : false;
  const wrapContent = props.settings && props.settings.wrapContent ? props.settings.wrapContent : false;
  const allowDownload =
    props.settings && props.settings.allowDownload !== undefined ? props.settings.allowDownload : false;

  const actionsRules =
    extensionEnabled(props.extensions, 'actions') && props.settings && props.settings.actionsRules
      ? props.settings.actionsRules
      : [];
  const compact = props.settings && props.settings.compact !== undefined ? props.settings.compact : false;
  const styleRules = useStyleRules(
    extensionEnabled(props.extensions, 'styling'),
    props.settings.styleRules,
    props.getGlobalParameter
  );

  const [notificationOpen, setNotificationOpen] = React.useState(false);
  const [columnVisibilityModel, setColumnVisibilityModel] = React.useState<GridColumnVisibilityModel>({});

  const useStyles = generateClassDefinitionsBasedOnRules(styleRules);
  const classes = useStyles();
  const tableRowHeight = compact ? TABLE_ROW_HEIGHT / 2 : TABLE_ROW_HEIGHT;
  const pageSizeReducer = compact ? 3 : 1;

  const columnWidthsType =
    props.settings && props.settings.columnWidthsType ? props.settings.columnWidthsType : 'Relative (%)';
  let columnWidths = null;
  try {
    columnWidths = props.settings && props.settings.columnWidths && JSON.parse(props.settings.columnWidths);
  } catch (e) {
    // do nothing
  } finally {
    // do nothing
  }

  const { records } = props;

  const generateSafeColumnKey = (key) => {
    return key != 'id' ? key : `${key} `;
  };

  const handlePopHoverClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopHoverClose = () => {
    setAnchorEl(null);
  };

  const actionableFields = actionsRules.filter((r) => r.condition !== 'rowCheck').map((r) => r.field);
  const columns = transposed
    ? [records[0].keys[0]].concat(records.map((record) => record._fields[0]?.toString() || '')).map((key, i) => {
        const uniqueKey = `${String(key)}_${i}`;
        return ApplyColumnType(
          {
            key: `col-key-${i}`,
            field: generateSafeColumnKey(uniqueKey),
            headerName: generateSafeColumnKey(key),
            headerClassName: 'table-small-header',
            disableColumnSelector: true,
            flex: columnWidths && i < columnWidths.length ? columnWidths[i] : 1,
            disableClickEventBubbling: true,
          },
          key,
          actionableFields.includes(key)
        );
      })
    : records[0] &&
      records[0].keys &&
      records[0].keys.map((key, i) => {
        const value = records[0].get(key);
        if (columnWidthsType == 'Relative (%)') {
          return ApplyColumnType(
            {
              key: `col-key-${i}`,
              field: generateSafeColumnKey(key),
              headerName: generateSafeColumnKey(key),
              headerClassName: 'table-small-header',
              disableColumnSelector: true,
              flex: columnWidths && i < columnWidths.length ? columnWidths[i] : 1,
              disableClickEventBubbling: true,
            },
            value,
            actionableFields.includes(key)
          );
        }
        return ApplyColumnType(
          {
            key: `col-key-${i}`,
            field: generateSafeColumnKey(key),
            headerName: generateSafeColumnKey(key),
            headerClassName: 'table-small-header',
            disableColumnSelector: true,
            width: columnWidths && i < columnWidths.length ? columnWidths[i] : 100,
            disableClickEventBubbling: true,
          },
          value,
          actionableFields.includes(key)
        );
      });

  useEffect(() => {
    const hiddenColumns = Object.assign(
      {},
      ...columns.filter((x) => x.field.startsWith(HIDDEN_COLUMN_PREFIX)).map((x) => ({ [x.field]: false }))
    );
    setColumnVisibilityModel(hiddenColumns);
  }, [records]);

  if (props.records == null || props.records.length == 0 || props.records[0].keys == null) {
    return <>No data, re-run the report.</>;
  }
  const getTransposedRows = (records) => {
    // Skip first key
    const rowKeys = [...records[0].keys];
    rowKeys.shift();

    // Add values in rows
    const rowsWithValues = rowKeys.map((key, i) =>
      Object.assign(
        { id: i, Field: key },
        ...records.map((record, j) => ({
          // Note the true here is for the rendered to know we are inside a transposed table
          // It will be needed for rendering the records properly, if they are arrays
          [`${record._fields[0]}_${j + 1}`]: RenderSubValue(record._fields[i + 1], true),
        }))
      )
    );

    // Add field in rows
    const rowsWithFieldAndValues = rowsWithValues.map((row, i) => ({
      ...row,
      [`${records[0].keys[0]}_${0}`]: rowKeys[i],
    }));

    return rowsWithFieldAndValues;
  };

  const rows = transposed
    ? getTransposedRows(records)
    : records.map((record, rownumber) => {
        return Object.assign(
          { id: rownumber },
          ...record._fields.map((field, i) => ({ [generateSafeColumnKey(record.keys[i])]: field }))
        );
      });

  const availableRowHeight = (props.dimensions.height - TABLE_HEADER_HEIGHT - TABLE_FOOTER_HEIGHT) / tableRowHeight;
  const tablePageSize = compact
    ? Math.round(availableRowHeight) - pageSizeReducer
    : Math.floor(availableRowHeight) - pageSizeReducer;

  const pageNames = getPageNumbersAndNamesList();
  const commonGridProps = {
    key: 'tableKey',
    headerHeight: 32,
    density: compact ? 'compact' : 'standard',
    rows: rows,
    columns: columns,
    columnVisibilityModel: columnVisibilityModel,
    onColumnVisibilityModelChange: (newModel) => setColumnVisibilityModel(newModel),
    onCellClick: (e) => performActionOnElement(e, actionsRules, { ...props, pageNames: pageNames }, 'Click', 'Table'),
    onCellDoubleClick: (e) => {
      let rules = getRule(e, actionsRules, 'doubleClick');
      if (rules !== null) {
        rules.forEach((rule) => executeActionRule(rule, e, { ...props, pageNames: pageNames }, 'table'));
      } else {
        setNotificationOpen(true);
        navigator.clipboard.writeText(e.value);
      }
    },
    checkboxSelection: hasCheckboxes(actionsRules),
    selectionModel: getCheckboxes(actionsRules, rows, props.getGlobalParameter),
    onSelectionModelChange: (selection) => updateCheckBoxes(actionsRules, rows, selection, props.setGlobalParameter),
    pageSize: tablePageSize > 0 ? tablePageSize : 5,
    rowsPerPageOptions: rows.length < 5 ? [rows.length, 5] : [5],
    disableSelectionOnClick: true,
    components: {
      ColumnSortedDescendingIcon: () => <></>,
      ColumnSortedAscendingIcon: () => <></>,
    },
    getRowClassName: (params) => {
      return ['row color', 'row text color']
        .map((e) => {
          return `rule${evaluateRulesOnDict(params.row, styleRules, [e])}`;
        })
        .join(' ');
    },
    getCellClassName: (params) => {
      return ['cell color', 'cell text color']
        .map((e) => {
          return `rule${evaluateRulesOnDict({ [params.field]: params.value }, styleRules, [e])}`;
        })
        .join(' ');
    },
  };

  const handleApiCall = async () => {
    setApiLoading(true);
    let response: AxiosResponse;
    const { method = '', endpoint = '', params } = props.settings?.apiSpec || {};
    const headers = {
      // 'Authorization': 'Bearer YOUR_TOKEN',
      // Add any other custom headers you need
    };
    const api = new ApiService({ headers });
    const appendParams = new URLSearchParams();

    if (params) {
      params.forEach((param) => appendParams.append(param.key, param.value));
    }

    try {
      switch (method.toUpperCase()) {
        case 'GET':
          response = await api.get(endpoint, appendParams);
          break;
        case 'POST':
          response = await api.post(endpoint, rows);
          break;
        case 'PUT':
          response = await api.put(endpoint, rows);
          break;
        case 'PATCH':
          response = await api.patch(endpoint, rows);
          break;
        case 'DELETE':
          response = await api.delete(endpoint);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      props.updateReportSetting('apiSpec', { ...props.settings.apiSpec, response });
    } catch (error) {
      // Handle errors here
      console.error('API call error:', error);
    } finally {
      setApiLoading(false);
    }
  };

  const apiCallButton = () => (
    <Stack direction='row' spacing={2} justifyContent='flex-end' marginRight={2}>
      <ButtonGroup color='primary' variant='outlined' aria-label='button group'>
        <Button size='small' onClick={handleApiCall} disabled={isApiLoading}>
          {isApiLoading ? 'Loading...' : 'Send'}
        </Button>
        <Button size='small' onClick={handlePopHoverClick} disabled={!props.settings.apiSpec.response}>
          View Response
        </Button>
        {props.settings.apiSpec.response ? (
          <Popover
            id={id}
            open={open}
            anchorEl={anchorEl}
            onClose={handlePopHoverClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
          >
            <Typography sx={{ p: 2 }}>{props.settings?.apiSpec.response.data}</Typography>
          </Popover>
        ) : (
          <></>
        )}
      </ButtonGroup>
    </Stack>
  );

  const isApiSpecEnabled = props.settings?.apiSpec && props.settings?.apiSpec.apiEnabled;

  const tableStyle: any = isApiSpecEnabled
    ? { marginTop: 10, height: '90%', width: '100%', position: 'relative' }
    : { height: '100%', width: '100%', position: 'relative' };

  return (
    <ThemeProvider theme={theme}>
      {isApiSpecEnabled ? apiCallButton() : <></>}
      <div className={classes.root} style={tableStyle}>
        <Snackbar
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          open={notificationOpen}
          autoHideDuration={2000}
          onClose={() => setNotificationOpen(false)}
          message='Value copied to clipboard.'
          action={
            <React.Fragment>
              <IconButton
                size='small'
                aria-label='close'
                color='inherit'
                onClick={() => setNotificationOpen(false)}
                clean
              >
                <XMarkIconOutline />
              </IconButton>
            </React.Fragment>
          }
        />

        {allowDownload && rows && rows.length > 0 ? (
          <Tooltip title='Download CSV' aria-label='' disableInteractive>
            <IconButton
              onClick={() => {
                downloadCSV(rows);
              }}
              aria-label='download csv'
              className='n-absolute n-z-10 n-bottom-2 n-left-1'
              clean
            >
              <CloudArrowDownIconOutline />
            </IconButton>
          </Tooltip>
        ) : (
          <></>
        )}

        {wrapContent ? (
          <DataGrid
            {...commonGridProps}
            getRowHeight={() => 'auto'}
            sx={{
              '&.MuiDataGrid-root--densityCompact .MuiDataGrid-cell': { py: '3px' },
              '&.MuiDataGrid-root--densityCompact .MuiDataGrid-cell:has(button)': { py: '0px' },
              '&.MuiDataGrid-root--densityStandard .MuiDataGrid-cell': { py: '15px' },
              '&.MuiDataGrid-root--densityComfortable .MuiDataGrid-cell': { py: '22px' },
              '&.MuiDataGrid-root .MuiDataGrid-cell': { wordBreak: 'break-word' },
            }}
          />
        ) : (
          <DataGrid {...commonGridProps} rowHeight={tableRowHeight} />
        )}
      </div>
    </ThemeProvider>
  );
};

export default NeoTableChart;
