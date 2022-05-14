import * as React from 'react';
import { Column, useExpanded, useFilters, useGroupBy, usePagination, useSortBy, useRowSelect, useTable, SortingRule } from "react-table";
import { IArchivedRoute } from 'src/Interfaces';
import { Table } from 'reactstrap';
import { useCallback, useEffect } from 'react';
import * as L from 'leaflet';
import ReactSlider from 'react-slider';
import styled from 'styled-components';
import { FaAngleDoubleLeft, FaAngleDoubleRight, FaAngleLeft, FaAngleRight, FaSort, FaSortDown, FaSortUp } from 'react-icons/fa';
import { ManageRoutesUtilities } from './ManageRoutesUtilities';

export interface IManageRoutesTableState {
  filters: Array<{id: string, value: any}>;
  sortBy: Array<SortingRule<IArchivedRoute>>;
  pageIndex: number;
}

export interface IManageRoutesTableProps {
    routes: IArchivedRoute[]; 
    selectedRouteIds: number[];
    markerLatLng: L.LatLng | undefined;
    enableSorting?: boolean;
    hideHeaders?: boolean;
    onRoutesSelected: (routes: IArchivedRoute[]) => any;
    tableState: IManageRoutesTableState;
    onTableStateChanged: (tableState: IManageRoutesTableState) => any;
}

const maxFilterDistanceKm = 80;
const maxDistanceKm = 100000;

export function ManageRoutesTable(props: IManageRoutesTableProps) {
    const data = props.routes;

    const ctcRoutesIds = React.useMemo(() => data.filter(route => route.id > 0 && route.ctcRoutesId > 0).map(route => route.ctcRoutesId), [data]);
    const tripHubIds = React.useMemo(() => data.filter(route => route.id > 0 && route.tripHubId > 0).map(route => route.tripHubId), [data]);
    const tripReportsIds = React.useMemo(() => data.filter(route => route.id > 0 && route.tripReportsId > 0).map(route => route.tripReportsId), [data]);

    const columns = React.useMemo<Array<Column<IArchivedRoute>>>(() => [
        {
          // column for selection checkboxes
          id: 'selection',
          // The header can use the table's getToggleAllRowsSelectedProps method
          // to render a checkbox
          Header: ({ getToggleAllPageRowsSelectedProps }) => (
            <div>
              {/* <div>
                <Button // clear all selected items
                  style={{height: 15, width: 15, backgroundColor: "transparent", color: "black", padding: "0", margin: "0", lineHeight: "0.5"}}
                  onClick={onClearAllClick}>x
                </Button>
              </div> */}
              <div>
                <IndeterminateCheckbox {...getToggleAllPageRowsSelectedProps()} />
              </div>
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
          canSort: true,
          sortType: (rowA: any, rowB: any, columnId: string, desc: boolean): number => {
            const a = rowA.isSelected;
            const b = rowB.isSelected;
            return a > b ? 1 : b > a ? -1 : 0;
          }                 
        },
        {
          id: 'date',
          Header: 'Date',
          accessor: 'date',
          filter: 'includesText',
          style: { width: '100px' }
        },
        {
          id: 'title',
          Header: 'Title',
          accessor: 'title',
          Cell: ({ row }: any) => ManageRoutesUtilities.TripTitleLink(row.original),
          filter: 'includesText'
        },
        {
          id: 'source',
          Header: 'Source',
          accessor: 'source',
          Cell: ({ row }: any) => ManageRoutesUtilities.TripSourceAndOriginalSource(row.original),
          Filter: SelectColumnFilter,
          filter: 'equals',
          style: { width: '100px' }
        },
        {
          id: 'status',
          Header: 'Status',
          accessor: (route: IArchivedRoute) => {
            return route.id > 0 ? 
              ( route.hidden ? 'Hidden' : '-' ) :
              (
                route.ctcRoutesId > 0 && ctcRoutesIds.find(id => id === route.ctcRoutesId) ||
                route.tripHubId > 0 && tripHubIds.find(id => id === route.tripHubId) ||
                route.tripReportsId > 0 && tripReportsIds.find(id => id === route.tripReportsId) 
              ) ? 'Imported' : 'Not Imported';
          },
          Filter: SelectColumnFilter,
          filter: 'equals',
          style: { width: '100px' }
        },
        {
          id: 'distance',
          Header: 'Distance',
          accessor: (route: IArchivedRoute) => {
            if (!props.markerLatLng || !route.bounds || route.bounds.length < 2) {
              return maxDistanceKm;
            } else {
              // console.log(">>> " + route.bounds);
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
          style: { width: '100px' }
        },
        // {
        //   id: 'text',
        //   Header: 'Text',
        //   accessor: (route: IArchivedRoute) => {
        //     return route.description?.length ?? 0;
        //   },
        //   style: { width: '80px' }
        // },
        // {
        //   id: 'coords',
        //   Header: 'Coords',
        //   accessor: (route: IArchivedRoute) => {
        //     const coordsCount = (route.summarizedRoutes ?? []).reduce((pv, cv) => pv + cv?.length ?? 0, 0);
        //     return coordsCount;
        //   },
        //   style: { width: '80px' }
        // }
      ], [data, props.markerLatLng, props.tableState]);

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
      [props.tableState.filters, props.tableState.sortBy]
    );

    const selectedRowIdsMap = React.useMemo(() => {
        const rowIdsMap = {};
        props.routes.forEach((route: IArchivedRoute, index: number) => {
          if (props.selectedRouteIds.find((routeId: number) => route.id === routeId)) {
            rowIdsMap[index] = true;
          }
        });
        return rowIdsMap;
      },
      [props.routes, props.selectedRouteIds]
    );

    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        prepareRow,
        setAllFilters,
        setSortBy,
        pageOptions,
        pageCount,
        page,
        state: { 
          pageIndex, 
          pageSize, 
          selectedRowIds 
        },
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
          pageIndex: props.tableState.pageIndex, 
          pageSize: 10,
          selectedRowIds: selectedRowIdsMap
        },
        autoResetSelectedRows: false,
        autoResetFilters: false,
        autoResetSortBy: false,
        defaultColumn, // Be sure to pass the defaultColumn option
        filterTypes,
        stateReducer: (newState, action) => {
          switch (action.type) {
            case 'toggleAllRowsSelected':
              // hack so that toggleAllRowsSelected unselects all rather than just what's on the current page
              // https://stackoverflow.com/questions/65096897/remove-all-selected-rows-even-though-im-in-other-page-using-react-table-with-co
              return {
                ...newState,
                selectedRowIds: {},
              };

            case 'setFilter':
            case 'setSortBy':
            case 'gotoPage':
              props.onTableStateChanged({ 
                filters: newState.filters, 
                sortBy: newState.sortBy,
                pageIndex: newState.pageIndex
              });
              return newState;
      
            default:
              return newState;
          }
        }
      }, 
      useFilters,
      useGroupBy,
      useSortBy, 
      useExpanded, 
      usePagination,
      useRowSelect
    );

    // ------------------
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

    // ------------------
    const onClearAllClick = useCallback((e: any) => {
      toggleAllRowsSelected(false);
    }, [selectedRowIds, toggleAllRowsSelected]);

    const onRowClick = useCallback((e: any) => {
      // if CTRL key pressed, then multi-select rows; else single-select
      const rowId = e.currentTarget.dataset.item;
      // const row = data[rowId];
      if (!e.ctrlKey && !Object.keys(selectedRowIds).find(selectedRowId => selectedRowId === rowId)) {
        toggleAllRowsSelected(false);
      }
    }, [selectedRowIds, toggleAllRowsSelected]);

    useEffect(() => {
      setAllFilters(props.tableState.filters);
    }, [props.tableState.filters]);
    
    useEffect(() => {
      setSortBy(props.tableState.sortBy);
    }, [props.tableState.sortBy]);
    
    useEffect(() => {
      gotoPage(props.tableState.pageIndex);
    }, [props.tableState.pageIndex]);
    
    useEffect(() => {
      const selectedRows = Object.keys(selectedRowIds).map(selectedRowId => data[selectedRowId]);
      props.onRoutesSelected(selectedRows);
    }, [selectedRowIds]);

    // ------------------

    return (
        <div className="ManageRoutesTable">

          <div className="pagination" style={{lineHeight: "1", marginBottom: '7px'}}>
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
                style={{ width: "50px"}}
              />
            </span>&nbsp;
            <select
              value={pageSize}
              onChange={onSetPageSizeChange}
              style={{lineHeight: "1"}}
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
                          headerGroup.headers.map((column: any, i: number) => (
                            <th key={'column' + i} style={column.style} scope="col">
                                <div>
                                  <span  {...column.getHeaderProps(column.getSortByToggleProps())}>
                                    {props.enableSorting ? (
                                      column.isSorted ? 
                                        column.isSortedDesc ? 
                                          <FaSortDown/> : 
                                          <FaSortUp/> : 
                                        <FaSort/>
                                    ) : ''}             
                                  </span>
                                  {column.render("Header")}
                                </div>
                                <div>
                                    {column.canFilter ? column.render("Filter") : null}
                                </div>
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
                      (row.original.hidden ? { color: "darkgrey", textDecoration: "line-through" } : { color: "black" }) :
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

  return (
    <div>
      <input id={column.id + "search"} style={{ width: "100%", lineHeight: "1"}}
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
      value={column.filterValue || ""}
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

function SliderColumnFilter({column} : {column: any}): any {
  const onChange = (value: number) => {
    column.setFilter(value);
  };

  const slider = React.useMemo(() => {
  return (
    <StyledSlider
        defaultValue={maxFilterDistanceKm}
        disabled={false}
        renderTrack={Track}
        renderThumb={Thumb}
        max={maxFilterDistanceKm}
        onChange={onChange}
        value={column.filterValue || maxFilterDistanceKm}
    />);
  }, [column.id, column.filterValue])

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
      <div style={{lineHeight: '1.5'}} >
        <input type="checkbox" ref={resolvedRef} {...rest} />
      </div>
    )
  }
)



