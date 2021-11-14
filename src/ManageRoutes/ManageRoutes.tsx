import * as React from 'react';
import { Component } from 'react';
import { Container, Row, Col, ButtonGroup, FormText } from 'reactstrap';
import { BaseUrl } from '..';
import { App } from '../App';
import { IArchivedRoute, IMap } from '../Interfaces';
import '../index.css';
import { FullWidthLoading, Pill, Spinner } from '../Widgets';
import { ManageRoutesMap, MapOperation } from './ManageRoutesMap';
import { IManageRoutesTableState, ManageRoutesTable } from './ManageRoutesTable';
import 'leaflet-gpx';
import * as L from 'leaflet';
import { ButtonWithTooltip } from 'src/ButtonWithTooltip';
import { MdAddBox, MdCallSplit, MdDeleteSweep, MdEdit, MdLibraryAdd, MdZoomOutMap, MdRestore } from 'react-icons/md';
import { FaArrowUp, FaMapMarkerAlt } from "react-icons/fa";
import { ButtonWithConfirm } from 'src/ButtonWithConfirm';
import { Accordian } from 'src/Accordian';
import { htmlToText } from 'html-to-text';
import { ManageRoutesUtilities } from './ManageRoutesUtilities';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';

export class ManageRoutes extends Component<{
    app: App,
    }, {
        isSaving: boolean,
        isLoading: boolean,
        routes: IArchivedRoute[]
        isLoadingRoute: boolean,
        selectedRoutes: IArchivedRoute[],
        mergedRoutes: IArchivedRoute,
        isEditing: boolean,
        makerLatLng: L.LatLng | undefined,
        mapOperation: MapOperation,
        tableState: IManageRoutesTableState
    }> {

    public app : App;
    private nz50MapsBySheet: { [mapSheet: string] : IMap } = {};
    private bounds: L.LatLngBounds | undefined = undefined;


    constructor(props:any){
        super(props)
        this.state = {
            isSaving: false,
            isLoading: true,
            routes: [],
            isLoadingRoute: false,
            selectedRoutes: [],
            mergedRoutes: this.mergeRoutes([]),
            isEditing: false,
            makerLatLng: undefined,
            mapOperation: MapOperation.None,
            tableState: { filters: [], sortBy: [], pageIndex: 0 }
        }
        this.app = this.props.app
        
        const nz50Maps: IMap[] = this.props.app.maps;
        this.nz50MapsBySheet = {};
        nz50Maps.forEach((nz50Map: IMap) => {
            this.nz50MapsBySheet[nz50Map.sheetCode] = nz50Map;
        });
    }

    public get(id: string) : any {
        return this.state.mergedRoutes[id];
    }

    public componentDidMount() {
        this.setState({isLoading: true});
        const promises: Array<Promise<IArchivedRoute[]>> = [
            this.props.app.triphubApiCall('GET', BaseUrl + "/routes?includeHidden=true"),
            this.props.app.triphubApiCall('GET', BaseUrl + "/routesroutearchive"),
            this.props.app.triphubApiCall('GET', BaseUrl + "/routestripreports"),
            this.props.app.triphubApiCall('GET', BaseUrl + "/routestriphub")
        ]
        Promise.all(promises)
        .then((routeGroups: IArchivedRoute[][]) => {
            this.setState({
                isLoading: false,
                routes: routeGroups
                    .reduce((previous: IArchivedRoute[], current: IArchivedRoute[]) => previous.concat(current), [])
                    .sort((r1: IArchivedRoute, r2: IArchivedRoute) => {
                        if (r1.creationDate || r2.creationDate) {
                            if (r1.creationDate && r2.creationDate) {
                                return r1.creationDate > r2.creationDate ? -1 : r1.creationDate < r2.creationDate ? -1 : 0;
                            }
                            return !r1.creationDate ? 1 : -1;
                        }
                        if (r1.date || r2.date) {
                            if (r1.date && r2.date) {
                                return r1.date > r2.date ? -1 : r1.date < r2.date ? -1 : 0;
                            }
                            return !r1.date ? 1 : -1;
                        }
                        return 0;                        
                    }) // display in reverse creation or trip date order
            });
            this.setState({ isLoading: false });
        })
            
    }

    public render() {

        const {isLoading} = this.state

        const archivedRoutesSelectedCount = this.state.selectedRoutes.filter(r => r.id > 0).length;
        const routesSelectedCount = this.state.selectedRoutes.length;
        const selectedRouteIds = this.state.selectedRoutes.map(route => route.id).filter(id => id > 0);
        const haveSelectedUnhiddenRoutes = routesSelectedCount > 0 && this.state.selectedRoutes.some(route => route.id > 0 && !route.hidden);
        const haveSelectedHiddenRoutes = routesSelectedCount > 0 && this.state.selectedRoutes.some(route => route.id > 0 && route.hidden);

        const onRoutesSelected = async (routes: IArchivedRoute[]) => {
            await this.setSelectedRoutes(routes);
        };

        const onNew = () => { 
            this.setState({ isEditing: true }); 
        }

        const onMultipleNew = async () => { 
            this.setState({ isEditing: false, isSaving: true }); 
            await this.setSelectedRoutes(await this.CopyAndSaveSelectedRoutes(100));
            this.setState({ isSaving: false }); 
        }

        const onEdit = () => { 
            this.setState({ isEditing: true }); 
        }

        const onSplit = async () => { 
            this.setState({ isEditing: false, isSaving: true }); 
            await this.setSelectedRoutes(await this.SplitRoute());
            this.setState({ isSaving: false }); 
        }

        const onHide = async () => { 
            this.setState({ isEditing: false, isSaving: true }); 
            await this.HideOrUnhideSelectedRoutes(true);
            this.setState({ isSaving: false }); 
        }

        const onUnhide = async () => { 
            this.setState({ isEditing: false, isSaving: true }); 
            await this.HideOrUnhideSelectedRoutes(false);
            this.setState({ isSaving: false }); 
        }

        // const onDelete = async () => { 
        //     this.setState({ isEditing: false, isSaving: true }); 
        //     await this.DeleteRoute(this.state.mergedRoutes);
        //     this.setState({ isSaving: false }); 
        // }

        const onMultipleDelete = async () => { 
            this.setState({ isEditing: false, isSaving: true }); 
            await this.DeleteSelectedRoutes();
            this.setState({ isSaving: false }); 
        }

        const onResetFilters = async () => {
            this.setState({ tableState: { filters: [], sortBy: [], pageIndex: 0 } })
        }

        const onSave = async (newRoute: IArchivedRoute): Promise<any> => {
            this.setState({ isEditing: false, isSaving: true }); 
            await this.setSelectedRoutes([await this.RecalculateAndSaveRoute(newRoute)]);
            await this.app.getArchivedRoutes(true, true); // force reload
            this.setState({isSaving: false});
        }

        const onCancel = (): Promise<void> => {
            this.setState({ isEditing: false }); 
            return Promise.resolve()
        }

        const getArchivedRoutes = (includeHidden: boolean, force: boolean) => this.app.getArchivedRoutes(includeHidden, force);
        const getArchivedRoute = (archivedRouteId: number): Promise<IArchivedRoute | undefined> =>  {
            return this.app.triphubApiCall('GET', BaseUrl + '/routes/' + archivedRouteId )
                .then((response: IArchivedRoute[]) => response !== null && response.length > 0 ? response[0] : undefined);  
        }

        const onGetValidationMessage = (): any => {
            return null;
        }

        const onBoundsChanged = (bounds: L.LatLngBounds) => {
            this.bounds = bounds;
        }

        const onMarkerMoved = (latLng: L.LatLng) => {
            this.setState({ makerLatLng: latLng }); 
        }

        const onMoveMarker = () => {
            // trigger the move
            this.setState({ mapOperation: MapOperation.MoveMarker }, async () => {
                this.setState({ mapOperation: MapOperation.None }); 
            }); 
        }

        const onZoomExtents = () =>{
            // trigger the move
            this.setState({ mapOperation: MapOperation.ZoomExtents }, async () => {
                this.setState({ mapOperation: MapOperation.None }); 
            }); 
        } 

        const onTableStateChanged = (tableState: IManageRoutesTableState) => {
            this.setState({ tableState });
        };


        return [
            <Container className={this.props.app.containerClassName} key='manageroutes' fluid={true}>
                <h1 key="title">Manage Routes</h1>
                {isLoading && <FullWidthLoading />}
                {!isLoading &&
                    <Container key='form' fluid={true}>
                        <Row>
                            <Col lg={12} xl={6}>
                                <ManageRoutesTable 
                                    routes={this.state.routes}
                                    selectedRouteIds={selectedRouteIds} 
                                    enableSorting={true}
                                    onRoutesSelected={onRoutesSelected}
                                    markerLatLng={this.state.makerLatLng}
                                    tableState={this.state.tableState}
                                    onTableStateChanged={onTableStateChanged}
                                /> 
                                <Row>
                                    <Col sm={6}>
                                        <FormText color="muted">&nbsp;&nbsp;<FaArrowUp/>&nbsp;CTRL/CMD-click to select multiple routes</FormText>
                                    </Col>
                                    <Col sm={5}>
                                        <strong>{this.state.selectedRoutes.length} of {this.state.routes.length}</strong>&nbsp;&nbsp;routes selected
                                    </Col>
                                    <Col sm={1}>
                                        {(this.state.isSaving || this.state.isLoadingRoute) && <span className='fa fa-spinner fa-spin' key='spinner'/>}
                                    </Col>
                                </Row> 
                            </Col>
                            <Col lg={12} xl={6}>
                                <Row>
                                    <ButtonGroup>
                                        <ButtonWithTooltip id="ResetFilters" color='secondary' 
                                            onClick={onResetFilters} disabled={false} 
                                            placement="top" tooltipText="Reset all filters and sorting">
                                            <MdRestore/>
                                        </ButtonWithTooltip>
                                    </ButtonGroup>
                                    <ButtonGroup>
                                        <ButtonWithTooltip id="NewRouteButton" color='secondary' 
                                            onClick={onNew} disabled={false} 
                                            placement="top" tooltipText="Create a new merged route from selected routes (create empty, if none selected)">
                                            <MdAddBox/>
                                        </ButtonWithTooltip>
                                        <ButtonWithConfirm id="MultipleNewRouteButton" color='secondary' 
                                            onClick={onMultipleNew} disabled={routesSelectedCount < 2}  
                                            placement="top" tooltipText="Create a new route for each of the selected routes"
                                            confirmText="Confirm create multiple routes">
                                            <MdLibraryAdd/>
                                        </ButtonWithConfirm>
                                        <ButtonWithTooltip id="EditRouteButton" color='secondary' 
                                            onClick={onEdit} disabled={archivedRoutesSelectedCount !== 1}  
                                            placement="top" tooltipText="Edit the selected route">
                                            <MdEdit/>
                                        </ButtonWithTooltip>
                                        <ButtonWithConfirm id="SplitRouteButton" color='secondary' 
                                            onClick={onSplit} disabled={routesSelectedCount === 0}  
                                            placement="top" tooltipText="Split the selected route(s) into separate routes"
                                            confirmText="Confirm split selected route(s)">
                                            <MdCallSplit/>
                                        </ButtonWithConfirm>
                                        <ButtonWithTooltip id="HideRouteButton" color='secondary' 
                                            onClick={onHide} disabled={!haveSelectedUnhiddenRoutes}  
                                            placement="top" tooltipText="Hide the selected route(s)">
                                            <AiOutlineEyeInvisible/>
                                        </ButtonWithTooltip>
                                        <ButtonWithTooltip id="UnhideRouteButton" color='secondary' 
                                            onClick={onUnhide} disabled={!haveSelectedHiddenRoutes}  
                                            placement="top" tooltipText="Unhide the selected route(s)">
                                            <AiOutlineEye/>
                                        </ButtonWithTooltip>
                                        {/* <ButtonWithConfirm id="DeleteRouteButton" color='secondary' 
                                            onClick={onDelete} disabled={!singleArchivedRouteSelected}  
                                            placement="top" tooltipText="Delete the selected route(s)"
                                            confirmText="Confirm delete">
                                            <MdDelete/>
                                        </ButtonWithConfirm> */}
                                        <ButtonWithConfirm id="MultipleDeleteRouteButton" color='secondary' 
                                            onClick={onMultipleDelete} disabled={archivedRoutesSelectedCount === 0}  
                                            placement="top" tooltipText="Delete all the selected routes"
                                            confirmText="Confirm delete selected">
                                            <MdDeleteSweep/>
                                        </ButtonWithConfirm>
                                    </ButtonGroup>
                                    <ButtonGroup>
                                        <ButtonWithTooltip id="MoveMarkerButton" color='secondary' 
                                            onClick={onMoveMarker} disabled={false} 
                                            placement="top" tooltipText="Move the map marker to the centre of the current map extents">
                                            <FaMapMarkerAlt/>
                                        </ButtonWithTooltip>
                                        <ButtonWithTooltip id="ZoomExtentsButton" color='secondary' 
                                            onClick={onZoomExtents} disabled={routesSelectedCount < 1}  
                                            placement="top" tooltipText="Zoom to the extents of the selected route(s)">
                                            <MdZoomOutMap/>
                                        </ButtonWithTooltip>
                                    </ButtonGroup>
                                </Row>
                                <Row>
                                    <Accordian key='routes' id='routes' className='trip-section' headerClassName='trip-section-header'
                                        title={
                                            <span>
                                                {routesSelectedCount === 0 && !this.state.isLoadingRoute && <FormText color="muted">No routes selected</FormText>}
                                                <b>{ManageRoutesUtilities.TripTitleLink(this.state.mergedRoutes)}</b>
                                            </span>
                                        }
                                        expanded={true}>
                                            <span>
                                                {this.state.mergedRoutes.description.split("\r")
                                                    .map((paragraph, index) => <div key={"para" + index}><p>{paragraph}</p></div>)}
                                            </span>
                                    </Accordian>
                                </Row>
                                <Row>
                                    <ManageRoutesMap 
                                        route={this.state.mergedRoutes}
                                        isEditing={this.state.isEditing}
                                        onSave={onSave}
                                        onCancel={onCancel}
                                        leafletMapId='manageroutesmap'
                                        nz50MapsBySheet={this.nz50MapsBySheet} 
                                        getArchivedRoutes={getArchivedRoutes}
                                        getArchivedRoute={getArchivedRoute}
                                        readOnly={this.state.isLoadingRoute}
                                        onBoundsChanged={onBoundsChanged}
                                        onMarkerMoved={onMarkerMoved}
                                        mapOperation={this.state.mapOperation}
                                    />
                                </Row>
                            </Col>
                        </Row>
                    </Container>
                }
            </Container>
        ]
    }

    private async RecalculateAndSaveRoute(newRoute: IArchivedRoute): Promise<IArchivedRoute> {
        newRoute.bounds = this.calculateBounds(newRoute.routes);
        newRoute.summarizedRoutes = this.summarizedRoutes(newRoute.routes);
        return await this.SaveRoute(newRoute);
    }
    
    private async setSelectedRoutes(routes: IArchivedRoute[]): Promise<void> {
        this.setState({isLoadingRoute: true});
        const promises: Array<Promise<void>> = routes.map((route: IArchivedRoute) => this.fillRouteDetails(route));
        await Promise.all(promises)
        .then(() => {
            const mergedRoutes = this.mergeRoutes(routes);
            this.setState({selectedRoutes: routes, mergedRoutes, mapOperation: MapOperation.ZoomExtents}, async () => {
                    this.setState({mapOperation: MapOperation.None});
            });
        })
        .finally(() => {
            this.setState({isLoadingRoute: false});
        });
    }

    private fillRouteDetails(route: IArchivedRoute): Promise<void> {
        if (!route || route.routes) {
            return Promise.resolve();
        }
        return this.getRouteDetails(route)
            .then((detailedRoute: IArchivedRoute) => {
                Object.assign(route, detailedRoute); // copy detailed route properties to route
            });
    }

    private async getRouteDetails(route: IArchivedRoute): Promise<IArchivedRoute | undefined> {
        const apiMethod = this.getRouteApiMethod(route);
        if (apiMethod == null) {
            return undefined;
        }

        const response: IArchivedRoute[] = await this.props.app.triphubApiCall('GET', BaseUrl + apiMethod);
        if (!response?.length) {
            return undefined;
        }
        const detailedRoute = response[0];
        if (!detailedRoute.routes && detailedRoute.gpx) {
            const routesFromGpx = await this.importMultiGpx(detailedRoute.gpx);
            if (routesFromGpx) {
                detailedRoute.routes = routesFromGpx;
            }
        }
        if (detailedRoute.routes) {
            if (!detailedRoute.bounds || detailedRoute.bounds.length === 0) {
                detailedRoute.bounds = this.calculateBounds(detailedRoute.routes);
            }
            if (!detailedRoute.summarizedRoutes || detailedRoute.summarizedRoutes.length === 0) {
                detailedRoute.summarizedRoutes = this.summarizedRoutes(detailedRoute.routes);
            }
        }

        if (detailedRoute.description) {
            detailedRoute.description = htmlToText(detailedRoute.description, {});
        }
        
        return detailedRoute;
    }

    private getRouteApiMethod(route: IArchivedRoute): string | null {
        const apiMethod = 
        route?.source === 'Routes' ? "/routes/" + route.id :
        route?.source === 'CtcRoutes' ? "/routesroutearchive/" + route.ctcRoutesId :
        route?.source === 'TripHub' ? "/routestriphub/" + route.tripHubId :
        route?.source === 'TripReports' ? "/routestripreports/" + route.tripReportsId :
        null;
        return apiMethod;
    }

    private calculateBounds(routes: Array<Array<[number, number]>>): Array<[number, number]> {
        if (!routes || routes.length === 0 || !routes[0] || routes[0].length === 0) {
            return [];
        }
        const firstLatLng = routes[0][0];
        const b = L.latLngBounds(firstLatLng, firstLatLng);
        routes.forEach((route => route.forEach(latLng => b.extend(latLng))));
        return [[b.getSouth(), b.getWest()], [b.getNorth(), b.getEast()]];
    }

    private summarizedRoutes(routes: Array<Array<[number, number]>>): Array<Array<[number, number]>> {
        return routes.map(route => {
            const latLngs = route.map(ll => new L.LatLng(ll[0], ll[1]));
            const generalizedLatLngs = this.generalize(latLngs, 100);
            return generalizedLatLngs.map(gpxLatLng => [gpxLatLng.lat, gpxLatLng.lng] as [number, number]);
        });
    }

    private importMultiGpx(multiGpx: string): Promise<Array<Array<[number, number]>> | undefined> {
        // import multiple gpx file contents which may or may not have been appended together with <Separator/> separator
        const gpxs = multiGpx.split("<GpxSeparator/>").filter((gpx: string) => gpx.length > 0);
        return Promise.all(gpxs.map((gpx: string) => this.importGpx(gpx))).then(results => 
            results.reduce(
                (allRoutes: Array<Array<[number, number]>>, newRoutes: Array<Array<[number, number]>>) => allRoutes.concat(newRoutes), []));
    }

    private importGpx(gpx: string): Promise<Array<Array<[number, number]>> | undefined> {

        // HACK - UTF-16 BOM - remove, otherwise gpzx.parse won't work
        if (gpx.charCodeAt(0) === 65279) {
            gpx = gpx.substr(1);
        }

        return new Promise<Array<Array<[number, number]>> | undefined>((resolve, reject) => {
            const routes: Array<Array<[number, number]>> = [];
            if (gpx.length === 0 || gpx[0] !== '<') {
                resolve(routes);
            } else {
                new L.GPX(gpx, {
                    async: true, 
                    polyline_options: {},
                    gpx_options:{
                        parseElements: ['track', 'route'] as any // yuk!
                    },
                    marker_options: {}
                }).on('addline', (event: any) => {
                    const gpxLatLngs = (event.line as L.Polyline).getLatLngs() as L.LatLng[];
                    const generalizedLatLngs = this.generalize(gpxLatLngs)
                    const route = generalizedLatLngs.map(gpxLatLng => [gpxLatLng.lat, gpxLatLng.lng] as [number, number]);
                    routes.push(route);
                }).on('loaded', () => {
                    resolve(routes);
                }).on('error', (event: any) => {
                    alert('Error loading file: ' + event.err);
                    resolve(routes);
                });
            }
        });
    }

    private generalize(latLngs: L.LatLng[], tolerance: number = 25): L.LatLng[] {
        const generalizedLatLngs: L.LatLng[] = [];
        let lastLatLng: L.LatLng | null = null;
        const lastIndex = latLngs.length - 1;
        latLngs.forEach((latLng: L.LatLng, index: number) => {
            if (lastLatLng === null || index === lastIndex) {
                generalizedLatLngs.push(latLng);
                lastLatLng = latLng;
            } else {
                if (latLng.distanceTo(lastLatLng) >= tolerance) {
                    generalizedLatLngs.push(latLng);
                    lastLatLng = latLng;
                }
            }
        });
        return generalizedLatLngs;
    }

    private copyRoute(route: IArchivedRoute): IArchivedRoute {
        return this.mergeRoutes([route]);
    }

    private mergeRoutes(routes: IArchivedRoute[]): IArchivedRoute {
        return {
            id: this.singleIdValue(routes.map(route => route.id)), 
            memberId: this.singleIdValue(routes.map(route => route.memberId)), 
            tripHubId: this.singleIdValue(routes.map(route => route.tripHubId)),
            ctcRoutesId: this.singleIdValue(routes.map(route => route.ctcRoutesId)),
            tripReportsId: this.singleIdValue(routes.map(route => route.tripReportsId)),
            source: "Routes",
            title: this.concatValues(routes.map(route => route.title), "; "),
            description: this.mergeDescriptions(routes),
            date: this.singleValue(routes.map(route => route.date)),
            creationDate: (new Date()).toISOString().substr(0, 10),
            gpxFilename: this.singleValue(routes.map(route => route.gpxFilename)),
            gpx: this.singleValue(routes.map(route => route.gpx)),
            bounds: this.mergeBounds(routes.map(route => route.bounds)),
            routes: this.concatArrays(routes.map(route => route.routes ?? [])), 
            summarizedRoutes: this.concatArrays(routes.map(route => route.summarizedRoutes ?? [])), 
            hidden: false,
            firstName: this.singleValue(routes.map(route => route.firstName)),
            lastName: this.singleValue(routes.map(route => route.lastName))
        };
    }

    // private tripLink(route: IArchivedRoute ): string {
    //     const subPath = 
    //     route?.source === 'Routes' ? "/routes/" + route.id :
    //     route?.source === 'CtcRoutes' ? "route-archivenew" + route.ctcRoutesId :
    //     route?.source === 'TripHub' ? "/routestriphub/" + route.tripHubId :
    //     route?.source === 'TripReports' ? "trip-reports?goto=tripreport=%2F" + route.tripReportsId :
    //     null;
    //     const ctcBaseUrl = "https://ctc.org.nz/index.php/"; // BJ TODO
    //     return subPath === null ? "" : ctcBaseUrl + subPath;
    // }

    private mergeDescriptions(routes: IArchivedRoute[]): string {
        if (routes.length === 1 && routes[0].source === "Routes") {
            // leave single Routes as is
            return routes[0].description;
        } else {
            // otherwise, truncate descriptions to reasonable length
            return routes.reduce((combined: string, route: IArchivedRoute) => {
                const maxDescriptionLength = 800;
                const abbreviatedDescription = route.description.length > (maxDescriptionLength + 20) ?
                    (route.description.substr(0, maxDescriptionLength) + " ...") : route.description;
                const routeSummary = (abbreviatedDescription.length === 0) ? "" :
                    route.title + ": " + abbreviatedDescription;
                    const tripLink = ManageRoutesUtilities.TripLink(route);
                return combined +
                    (combined.length > 0 ? "\r" : "") + 
                    routeSummary;
            }, "");
        }
    }

    private singleIdValue( s: number[]): number {
        return s.reduce((p: number, c: number) => (
                (p === 0 ? c :
                 c === 0 ? p :
                 p === c ? p : 0
                ) ?? 0
            ), 0
        );
    }
    private singleValue( s: string[]): string {
        return s.reduce((p: string, c: string) => (
                (p === "" ? c :
                 c === "" ? p :
                 p === c ? p : null
                ) ?? ""
            ), ""
        );
    }

    private concatValues( s: string[], separator: string): string {
        return s.reduce((p: string, c: string) => (
                p === "" ? c :
                c === "" ? p :
                p + separator + c
            ), ""
        );
    }

    private concatArrays( a: any[][]): any[] {
        return a.reduce((p: any[], c: any[]) => (
                p === [] ? c :
                c === [] ? p :
                p.concat(c)
            ), []
        );
    }

    private mergeBounds(routesBounds: Array<Array<[number, number]>>): Array<[number, number]> {
        return this.calculateBounds(routesBounds);
    }

    private async CopyAndSaveSelectedRoutes(tolerance: number = 0): Promise<IArchivedRoute[]> {
        return Promise.all(this.state.selectedRoutes.map(async (route: IArchivedRoute) => {
            const copiedRoute = this.copyRoute(route);
            if (tolerance > 0) {
                copiedRoute.routes = copiedRoute.routes.map(r => {
                    const latLngs = r.map(c => new L.LatLng(c[0], c[1]));
                    const generalizedLatLngs = this.generalize(latLngs, tolerance);
                    const generalizedRoute = generalizedLatLngs.map(gpxLatLng => [gpxLatLng.lat, gpxLatLng.lng] as [number, number]);
                    return generalizedRoute;
                })
            }
            return await this.SaveRoute(copiedRoute);
        }));
    }

    private async SplitRoute(): Promise<IArchivedRoute[]> {
        const routes: IArchivedRoute[] = [];
        this.state.mergedRoutes.routes.forEach(async (route: Array<[number, number]>, index: number) => {
            const newRoute = this.copyRoute(this.state.mergedRoutes);
            newRoute.routes = [route];
            newRoute.summarizedRoutes = [newRoute.summarizedRoutes[index]];
            newRoute.bounds = this.calculateBounds(newRoute.routes);
            routes.push(await this.SaveRoute(newRoute));
        });
        return Promise.resolve(routes);
    }

    private async HideOrUnhideSelectedRoutes(hide: boolean): Promise<any> {
        this.state.selectedRoutes.forEach(async (route: IArchivedRoute) => {
            if (route.id > 0) {
                route.hidden = hide;
                await this.SaveRoute(route);
            }
        });
        return Promise.resolve();
    }

    private async SaveRoute(newRoute: IArchivedRoute): Promise<IArchivedRoute> {
        let response: IArchivedRoute[];
        if (newRoute.id > 0) {
            response = await this.app.triphubApiCall('PATCH', BaseUrl + '/routes/' + newRoute.id, newRoute );
        } else {
            response = await this.app.triphubApiCall('POST', BaseUrl + '/routes', newRoute );
        }
        if (response && response.length > 0) { // should only be one
            const savedRoute: IArchivedRoute = response[0];
            savedRoute.source = "Routes";
            let newRoutes; // new routes array will force table to re-render
            if (newRoute.id === 0) {
                newRoutes = [savedRoute].concat(this.state.routes); // add to begining as these are the most recently created
            } else {
                newRoutes = this.state.routes.map((route: IArchivedRoute) => route.id === savedRoute.id ? savedRoute : route); // replace edited route
            }
            this.setState({
                routes: newRoutes
            }, async () => {
                await this.setSelectedRoutes([savedRoute]);
            });
        }
        return Promise.resolve(response[0])
    }

    private async DeleteSelectedRoutes(): Promise<any> {
        this.state.selectedRoutes.forEach(async (route: IArchivedRoute) => {
            await this.DeleteRoute(route);
        });
        return Promise.resolve();
    }

    private async DeleteRoute(routeToDelete: IArchivedRoute): Promise<void> {
        if (routeToDelete.id > 0) {
            await this.app.triphubApiCall('DELETE', BaseUrl + '/routes/' + routeToDelete.id );
            this.setState({
                routes: this.state.routes.filter(route => route.id !== routeToDelete.id)
            });
            await this.setSelectedRoutes([]);
        }
        return Promise.resolve()
    }

}
