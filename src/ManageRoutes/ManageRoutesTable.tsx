import * as React from 'react';
import { Column, useExpanded, useFilters, useGroupBy, usePagination, useSortBy, useRowSelect, useTable } from "react-table";
import { IArchivedRoute } from 'src/Interfaces';
import { Table } from 'reactstrap';
import { useEffect } from 'react';
import { MdAddCircle, MdEdit, MdLanguage } from 'react-icons/md';
import * as L from 'leaflet';

export interface IManageRoutesTableProps {
    routes: IArchivedRoute[]; 
    bounds: L.LatLngBounds | undefined;
    enableSorting?: boolean;
    hideHeaders?: boolean;
    onRoutesSelected: (routes: IArchivedRoute[]) => any;
}

export function ManageRoutesTable(props: IManageRoutesTableProps) {
    const data = props.routes;
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
            Header: 'B',
            accessor: (route: IArchivedRoute) => {
              if (!props.bounds || !route.bounds) {
                return '-';
              } else {
                const routeBounds = route.bounds as [[number, number], [number, number]];
                return (props.bounds as L.LatLngBounds).overlaps(routeBounds) ? 'Y' : ' ';
              }
            },
            Filter: SelectColumnFilter,
            filter: 'equals'
            },
            {
            Header: 'R',
            accessor: (route: IArchivedRoute) => {
              return route.id === 0 && route.ctcRoutesId > 0 ? 'Yes' : 'No';
            },
            Filter: SelectColumnFilter,
            filter: 'equals'
            }], []);

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


    const onRowClick = (e: any) => {
      // if CTRL key pressed, then multi-select rows; else single-select
      const rowId = e.currentTarget.dataset.item;
      // const row = data[rowId];
      if (!e.ctrlKey && !Object.keys(selectedRowIds).find(selectedRowId => selectedRowId === rowId)) {
        toggleAllRowsSelected(false);
      }
    };

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



