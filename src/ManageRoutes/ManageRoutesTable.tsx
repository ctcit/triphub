import * as React from 'react';
import { Column, useExpanded, useFilters, useGroupBy, usePagination, useSortBy, useRowSelect, useTable } from "react-table";
import { IArchivedRoute } from 'src/Interfaces';
import { Table } from 'reactstrap';
import { useCallback, useEffect } from 'react';
import * as L from 'leaflet';
import ReactSlider from 'react-slider';
import styled from 'styled-components';

export interface IManageRoutesTableProps {
    routes: IArchivedRoute[]; 
    markerLatLng: L.LatLng | undefined;
    enableSorting?: boolean;
    hideHeaders?: boolean;
    onRoutesSelected: (routes: IArchivedRoute[]) => any;
}

const maxFilterDistanceKm = 500;

export function ManageRoutesTable(props: IManageRoutesTableProps) {
    const data = props.routes;

    const ctcRoutesIds = props.routes.filter(route => route.id > 0 && route.ctcRoutesId > 0).map(route => route.ctcRoutesId);
    const tripHubIds = props.routes.filter(route => route.id > 0 && route.tripHubId > 0).map(route => route.tripHubId);
    const tripReportsIds = props.routes.filter(route => route.id > 0 && route.tripReportsId > 0).map(route => route.tripReportsId);

    const sortByDistance = (rowA: any, rowB: any, columnId: any) => {
      const a = rowA.original[columnId].toLowerCase()
      const b = rowB.original[columnId].toLowerCase()
      if (a > b) {
        return 1
      }
      if (b > a) {
        return -1
      }
      return 0
      };

    const columns = React.useMemo<Array<Column<IArchivedRoute>>>(() => [{
            Header: 'Date',
            accessor: 'date',
            filter: 'includesText',
            },
            {
            Header: 'Title',
            accessor: 'title',
            filter: 'includesText',
            },
            {
            Header: 'Source',
            accessor: 'source',
            Filter: SelectColumnFilter,
            filter: 'equals'
            },
            {
            Header: 'Distance',
            accessor: (route: IArchivedRoute) => {
              if (!props.markerLatLng || !route.bounds) {
                return '_';
              } else {
                const routeBounds = new L.LatLngBounds(route.bounds); // as [[number, number], [number, number]];
                const distance = Math.round((props.markerLatLng as L.LatLng).distanceTo(routeBounds.getCenter()) / 1000);
                return distance;
              }
            },
            Cell: ({ value }: any) => String(value) + (typeof value === 'number' ? ' km' : ''),
            Filter: SliderColumnFilter,
            filter: 'lessThanOrEqualToNumber',
            // sortType: React.useMemo(() => sortByDistance, [])
            },
            {
            Header: 'Imported',
            accessor: (route: IArchivedRoute) => {
              return route.id > 0 ? '-' :
                (
                  route.ctcRoutesId > 0 && ctcRoutesIds.find(id => id === route.ctcRoutesId) ||
                  route.tripHubId > 0 && tripHubIds.find(id => id === route.tripHubId) ||
                  route.tripReportsId > 0 && tripReportsIds.find(id => id === route.tripReportsId) 
                ) ? 'Yes' : 'No';
            },
            Filter: SelectColumnFilter,
            filter: 'equals'
            }], [data, props.markerLatLng]);

      const filterTypes = React.useMemo(() => ({
          // startsWithText: (rowsToFilter: any[], id: any, filterValue: any) => {
          //   return rowsToFilter.filter(row => {
          //     const rowValue = row.values[id]
          //     return rowValue !== undefined
          //       ? String(rowValue)
          //           .toLowerCase()
          //           .startsWith(String(filterValue).toLowerCase())
          //       : true
          //   })
          // },
          includesText: (rowsToFilter: any[], id: any, filterValue: any) => {
            return rowsToFilter.filter(row => {
              const rowValue = row.values[id]
              return rowValue !== undefined
                ? String(rowValue)
                    .toLowerCase()
                    .includes(String(filterValue).toLowerCase())
                : true
            })
          },
          lessThanOrEqualToNumber: (rowsToFilter: any[], id: any, filterValue: any) => {
            return rowsToFilter.filter(row => {
              const rowValue = row.values[id]
              return filterValue !== undefined && Number(filterValue) < maxFilterDistanceKm ?
                rowValue !== undefined ?
                  Number(rowValue) <= Number(filterValue)
                  : false
                : true
            })
          }
        }),
        []
      );

    const defaultColumn = React.useMemo(() => ({
        // Let's set up our default Filter UI
        Filter: DefaultColumnFilter,
      }),
      []
    );

    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        prepareRow,
        pageOptions,
        pageCount,
        page,
        state: { pageIndex, pageSize, selectedRowIds },
        gotoPage,
        previousPage,
        nextPage,
        setPageSize,
        canPreviousPage,
        canNextPage,
        toggleAllRowsSelected
    } = useTable<IArchivedRoute>({ 
      columns, 
      data,
      initialState: { 
        pageIndex: 0, 
        pageSize: 10
      },
      autoResetSelectedRows: true,
      defaultColumn, // Be sure to pass the defaultColumn option
      filterTypes
    }, 
      useFilters,
      useGroupBy,
      useSortBy, 
      useExpanded, 
      usePagination,
      useRowSelect,
      hooks => {
        hooks.visibleColumns.push(visibleColumns => [
          // column for selection
          {
            id: 'selection',
            // The header can use the table's getToggleAllRowsSelectedProps method
            // to render a checkbox
            Header: ({ getToggleAllPageRowsSelectedProps }) => (
              <div>
                <IndeterminateCheckbox {...getToggleAllPageRowsSelectedProps()} />
              </div>
            ),
            // The cell can use the individual row's getToggleRowSelectedProps method
            // to the render a checkbox
            Cell: ({ row }: any) => {
              return (
                  <div>
                    <IndeterminateCheckbox {...row.getToggleRowSelectedProps()} />
                  </div>
                )
              },
          },
          ...visibleColumns,
        ])
      }
    );

    useEffect(() => {
      const selectedRows = Object.keys(selectedRowIds).map(selectedRowId => data[selectedRowId]);
      props.onRoutesSelected(selectedRows);
    }, [selectedRowIds]);
    
    const onFirstPageClick = () => gotoPage(0);
    const onPreviousPageClick = () => previousPage();
    const onNextPageClick = () => nextPage();
    const onLastPageClick = () => gotoPage(pageCount - 1);
    const onGotoPageChange = (e: any) => {
      const newPage = e.target.value ? Number(e.target.value) - 1 : 0
      gotoPage(newPage)
    };
    const onSetPageSizeChange = (e: any) => {
      setPageSize(Number(e.target.value))
    };

    const onRowClick = useCallback((e: any) => {
      // if CTRL key pressed, then multi-select rows; else single-select
      const rowId = e.currentTarget.dataset.item;
      // const row = data[rowId];
      if (!e.ctrlKey && !Object.keys(selectedRowIds).find(selectedRowId => selectedRowId === rowId)) {
        // Workaround to deselect non filtered rows -> toggleAllRowsSelected only works with current filtered rows
        Object.keys(selectedRowIds).forEach((key, index) => {
          selectedRowIds[key] = false;
        });
        toggleAllRowsSelected(false) // needed to trigger an update
      }
    }, [selectedRowIds, toggleAllRowsSelected]);

    return (
        <div className="ManageRoutesTable">

          <div className="pagination">
            <button onClick={onFirstPageClick} disabled={!canPreviousPage}>
              {'<<'}
            </button>{' '}
            <button onClick={onPreviousPageClick} disabled={!canPreviousPage}>
              {'<'}
            </button>{' '}
            <button onClick={onNextPageClick} disabled={!canNextPage}>
              {'>'}
            </button>{' '}
            <button onClick={onLastPageClick} disabled={!canNextPage}>
              {'>>'}
            </button>{' '}
            <span>
              Page{' '}
              <strong>
                {pageIndex + 1} of {pageOptions.length}
              </strong>{' '}
            </span>
            <span>
              | Go to page:{' '}
              <input
                type="number"
                defaultValue={pageIndex + 1}
                onChange={onGotoPageChange}
                style={{ width: '100px' }}
              />
            </span>{' '}
            <select
              value={pageSize}
              onChange={onSetPageSizeChange}
            >
              {[10, 15, 20, 25, 50].map(newPageSize => (
                <option key={newPageSize} value={newPageSize}>
                  Show {newPageSize}
                </option>
              ))}
            </select>
          </div>

          <Table striped={true} bordered={true} hover={true} size="sm" {...getTableProps()}>
            {!props.hideHeaders && (
            <thead>
              {
                headerGroups.map((headerGroup: any) => (
                  <tr {...headerGroup.getHeaderGroupProps()}>
                    {
                      headerGroup.headers.map((column: any) => (
                        <th
                          {...column.getHeaderProps(column.getSortByToggleProps())}
                        >
                          <span>
                              {props.enableSorting ? (
                                column.isSorted ? 
                                  column.isSortedDesc ? 
                                    ' 🔽' : 
                                    ' 🔼' : 
                                  ''
                              ) : ''}             
                          </span>
                          {
                            column.render("Header")
                          }
                          <div>{React.useMemo(() => column.canFilter ? column.render('Filter') : null, [data])}</div>
                        </th>
                      ))
                    }
                  </tr>
                ))
              }
            </thead>
          )}

          <tbody {...getTableBodyProps()}>
            {
              page.map((row: any) => {
                prepareRow(row);
                return (
                  <tr key={row.id} {...row.getRowProps()} data-item={row.id} onClick={onRowClick}>
                    {
                      row.cells.map((cell: any) => {
                        return (
                          <td key={cell.id} {...cell.getCellProps()}>
                            {
                              cell.render("Cell")
                            }
                          </td>
                        );
                      })
                    }
                  </tr>
                );
              })
            }
          </tbody>
        </Table>

      </div>
    )
}
export default ManageRoutesTable;

// Define a default UI for filtering
function DefaultColumnFilter({column} : {column: any}) {
  const count = column.preFilteredRows.length

  const onDefaultColumnFilterChange = (e: any) => {
    column.setFilter(e.target.value || undefined) // Set undefined to remove the filter entirely
  };

  return (
    <input
      value={column.filterValue || ''}
      onChange={onDefaultColumnFilterChange}
      placeholder={`Search ${count} records...`}
    />
  )
}

// This is a custom filter UI for selecting
// a unique option from a list
function SelectColumnFilter({column} : {column: any}) {
  // Calculate the options for filtering
  // using the preFilteredRows
  const options = React.useMemo(() => {
    const optionsSet = new Set()
    column.preFilteredRows.forEach((row: any) => {
      optionsSet.add(row.values[column.id])
    })
    return [...Array.from(optionsSet.values())] as string[]
  }, [column.id, column.preFilteredRows])

  const onSelectColumnFilterChange = (e: any) => {
    column.setFilter(e.target.value || undefined)
  };

  // Render a multi-select box
  return (
    <select
      value={column.filterValue}
      onChange={onSelectColumnFilterChange}
    >
      <option value="">All</option>
      {options.map((option, i) => (
        <option key={i} value={option}>
          {option}
        </option>
      ))}
    </select>
  )
}

// This is a custom filter UI for selecting a number
function SliderColumnFilter({column} : {column: any}): any {
  const onChange = (value: number) => {
      column.setFilter(value);
    };

  const StyledSlider = styled(ReactSlider)`
      width: 100px;
      height: 25px;
  `;
  const StyledThumb = styled.div`
      height: 25px;
      line-height: 25px;
      width: 25px;
      text-align: center;
      background-color: #426AFE;
      color: #fff;
      border-radius: 50%;
      cursor: grab;
  `;
  const Thumb = (props: any, state: any) => <StyledThumb {...props}>
        {(state.valueNow < maxFilterDistanceKm ? state.valueNow : '-')}
      </StyledThumb>;
  const StyledTrack = styled.div`
      top: 0;
      bottom: 0;
      background: ${(props: any) => props.index === 2 ? '#300' : props.index === 1 ? '#ddd' : '#d6e5f8d8'};
      border-radius: 999px;
  `;
  const Track = (props: any, state: any) => <StyledTrack {...props} index={state.index} />;

    return (
      <StyledSlider
          defaultValue={maxFilterDistanceKm}
          disabled={false}
          renderTrack={Track}
          renderThumb={Thumb}
          max={maxFilterDistanceKm}
          onChange={onChange}
      />);
  
}

const IndeterminateCheckbox = React.forwardRef(
  ({ indeterminate, ...rest } : any, ref) => {
    const defaultRef = React.useRef()
    const resolvedRef: any = ref || defaultRef

    React.useEffect(() => {
      resolvedRef.current.indeterminate = indeterminate
    }, [resolvedRef, indeterminate])

    return (
      <>
        <input type="checkbox" ref={resolvedRef} {...rest} />
      </>
    )
  }
)



