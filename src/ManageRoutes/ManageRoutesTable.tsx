import * as React from 'react';
import { Column, useExpanded, useFilters, useGroupBy, usePagination, useSortBy, useRowSelect, useTable } from "react-table";
import { IArchivedRoute } from 'src/Interfaces';
import { Table } from 'reactstrap';
import { useCallback, useEffect } from 'react';
import * as L from 'leaflet';
import ReactSlider from 'react-slider';
import styled from 'styled-components';
import { FaAngleDoubleLeft, FaAngleDoubleRight, FaAngleDown, FaAngleLeft, FaAngleRight, FaAngleUp, FaCaretLeft } from 'react-icons/fa';

export interface IManageRoutesTableProps {
    routes: IArchivedRoute[]; 
    markerLatLng: L.LatLng | undefined;
    enableSorting?: boolean;
    hideHeaders?: boolean;
    onRoutesSelected: (routes: IArchivedRoute[]) => any;
}

const maxFilterDistanceKm = 150;
const maxDistanceKm = 100000;

export function ManageRoutesTable(props: IManageRoutesTableProps) {
    const data = props.routes;

    const ctcRoutesIds = props.routes.filter(route => route.id > 0 && route.ctcRoutesId > 0).map(route => route.ctcRoutesId);
    const tripHubIds = props.routes.filter(route => route.id > 0 && route.tripHubId > 0).map(route => route.tripHubId);
    const tripReportsIds = props.routes.filter(route => route.id > 0 && route.tripReportsId > 0).map(route => route.tripReportsId);

    const columns = React.useMemo<Array<Column<IArchivedRoute>>>(() => [{
            id: 'date',
            Header: 'Date',
            accessor: 'date',
            filter: 'includesText',
            width: 100
            },
            {
            id: 'title',
            Header: 'Title',
            accessor: 'title',
            filter: 'includesText',
            width: 200
            },
            {
            id: 'source',
            Header: 'Source',
            accessor: 'source',
            Filter: SelectColumnFilter,
            filter: 'equals',
            width: 80
            },
            {
            id: 'imported',
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
            filter: 'equals',
            width: 60

            },
            {
            id: 'distance',
            Header: 'Distance',
            accessor: (route: IArchivedRoute) => {
              if (!props.markerLatLng || !route.bounds) {
                return maxDistanceKm;
              } else {
                const routeBounds = new L.LatLngBounds(route.bounds); // as [[number, number], [number, number]];
                const distance = Math.min(maxDistanceKm, Math.round((props.markerLatLng as L.LatLng).distanceTo(routeBounds.getCenter()) / 1000));
                return distance;
              }
            },
            Cell: ({ value }: any) => <div style={{ textAlign: "right" }}>{value === maxDistanceKm ? '-' : String(value) + ' km'}</div>,
            Filter: SliderColumnFilter,
            filter: 'lessThanOrEqualToNumber',
            // useMemo gives an error on sortYpe - don't know why
            sortType: (rowA: any, rowB: any, columnId: string, desc: boolean): number => {
              const a = rowA.values[columnId]
              const b = rowB.values[columnId]
              return a > b ? 1 : b > a ? -1 : 0;
            },
            width: 80

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
        toggleAllRowsSelected(false);
      }
    }, [selectedRowIds, toggleAllRowsSelected]);

    return (
        <div className="ManageRoutesTable">

          <div className="pagination">
            <button onClick={onFirstPageClick} disabled={!canPreviousPage}>
              <FaAngleDoubleLeft/>
            </button>&nbsp;
            <button onClick={onPreviousPageClick} disabled={!canPreviousPage}>
              <FaAngleLeft/>
            </button>&nbsp;
            <button onClick={onNextPageClick} disabled={!canNextPage}>
              <FaAngleRight/>
            </button>&nbsp;
            <button onClick={onLastPageClick} disabled={!canNextPage}>
              <FaAngleDoubleRight/>
            </button>&nbsp;
            <span>
              &nbsp;&nbsp;
              Page{' '}
              <strong>
                {pageIndex + 1} of {pageOptions.length}
              </strong>
              &nbsp;&nbsp;
              |&nbsp;&nbsp;
              Go to page:&nbsp;
              <input
                type="number"
                defaultValue={pageIndex + 1}
                onChange={onGotoPageChange}
                style={{ width: '50px' }}
              />
            </span>&nbsp;
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

          {/* <Styles> */}
            {/* <div className="tableWrap"> */}
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
                                        <FaAngleDown/> : 
                                        <FaAngleUp/> : 
                                      ''
                                  ) : ''}             
                              </span>
                              {
                                column.render("Header")
                              }
                              <div>{column.canFilter ? column.render('Filter') : null}</div>
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

                    const style = row.original.source === "Routes" ?
                      { color: "black" } :
                      { fontStyle: "italic", color: "grey" };

                    return (
                      <tr key={row.id} {...row.getRowProps()} data-item={row.id} onClick={onRowClick} 
                        style={style}>
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
          {/* </div> */}
        {/* </Styles> */}

      </div>
    )
}
export default ManageRoutesTable;

// Define a default UI for filtering
function DefaultColumnFilter({column} : {column: any}) {
  // const count = column.preFilteredRows.length

  const onDefaultColumnFilterChange = (e: any) => {
    column.setFilter(e.target.value || undefined) // Set undefined to remove the filter entirely
  };

  const style = { width: (column.width || 200) + "px" };
  return (
    <div style={style}>
      <input id={column.id + "search"} style={{ width: "100%"}}
        value={column.filterValue || ''}
        onChange={onDefaultColumnFilterChange}
        placeholder={`Search...`}
      />
    </div>
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
      color: #ffffff;
      border-radius: 50%;
      cursor: grab;
  `;
  const Thumb = (props: any, state: any) => <StyledThumb {...props}>
        {(state.valueNow < maxFilterDistanceKm ? state.valueNow : '-')}
      </StyledThumb>;
  const StyledTrack = styled.div`
      top: 0;
      bottom: 0;
      background: ${(props: any) => props.index === 2 ? '#030000' : props.index === 1 ? '#dddddd' : '#d6e5f8d8'};
      border-radius: 999px;
  `;
  const Track = (props: any, state: any) => <StyledTrack {...props} index={state.index} />;

  const slider = React.useMemo(() => {
    return (
      <StyledSlider
          defaultValue={maxFilterDistanceKm}
          disabled={false}
          renderTrack={Track}
          renderThumb={Thumb}
          max={maxFilterDistanceKm}
          onChange={onChange}
      />);
  }, [column.id, column.preFilteredRows])

  return slider;
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



