import * as React from 'react';
import { Component } from 'react';
import { Container, Row, Col, ButtonGroup, FormText } from 'reactstrap';
import { BaseUrl } from '..';
import { App } from '../App';
import { IArchivedRoute, IMap } from '../Interfaces';
import '../index.css';
import { FullWidthLoading, Spinner } from '../Widgets';
import { ManageRoutesMap } from './ManageRoutesMap';
import { ManageRoutesTable } from './ManageRoutesTable';
import 'leaflet-gpx';
import * as L from 'leaflet';
import { ButtonWithTooltip } from 'src/ButtonWithTooltip';
import { MdAddBox, MdCallSplit, MdDeleteSweep, MdEdit, MdLibraryAdd } from 'react-icons/md';
import { FaRegHandPointUp } from "react-icons/fa";
import { ButtonWithConfirm } from 'src/ButtonWithConfirm';
import { Accordian } from 'src/Accordian';
import { htmlToText } from 'html-to-text';

export class ManageRoutes extends Component<{
    app: App,
    }, {
        isSaving: boolean,
        isLoading: boolean,
        routes: IArchivedRoute[]
        isLoadingRoute: boolean,
        selectedRoutes: IArchivedRoute[]
        mergedRoutes: IArchivedRoute,
        isEditing: boolean,
        makerLatLng: L.LatLng | undefined
    }> {

    public app : App;
    private nz50MapsBySheet: { [mapSheet: string] : IMap } = {};
    private archivedRoutesById: { [archivedRouteId: string] : IArchivedRoute } = {};
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
            makerLatLng: undefined
        }
        this.app = this.props.app
        
        const nz50Maps: IMap[] = this.props.app.getMaps();
        this.nz50MapsBySheet = {};
        nz50Maps.forEach((nz50Map: IMap) => {
            this.nz50MapsBySheet[nz50Map.sheetCode] = nz50Map;
        });

        const archivedRoutes: IArchivedRoute[] = this.props.app.getArchivedRoutes();
        this.archivedRoutesById = {};
        archivedRoutes.forEach((archivedRoute: IArchivedRoute) => {
            this.archivedRoutesById[archivedRoute.id] = archivedRoute;
        });
    }

    public get(id: string) : any {
        return this.state.mergedRoutes[id];
    }

    public componentDidMount() {
        this.props.app.setStatus(['Loading ', Spinner])
        const promises: Array<Promise<IArchivedRoute[]>> = [
            this.props.app.triphubApiCall('GET', BaseUrl + "/routes"),
            this.props.app.triphubApiCall('GET', BaseUrl + "/routesroutearchive"),
            this.props.app.triphubApiCall('GET', BaseUrl + "/routestripreports"),
            this.props.app.triphubApiCall('GET', BaseUrl + "/routestriphub")
        ]
        Promise.all(promises)
        .then((routeGroups: IArchivedRoute[][]) => {
            this.setState({
                isLoading: false,
                routes: routeGroups.reduce((previous: IArchivedRoute[], current: IArchivedRoute[]) => previous.concat(current), [])
            });
            this.props.app.setState({ isLoading: false });
            this.props.app.setStatus('Loaded', 3000)
        })
            
    }

    public render() {

        const {isLoading} = this.state

        const archivedRoutesSelectedCount = this.state.selectedRoutes.filter(r => r.id > 0).length;
        const routesSelectedCount = this.state.selectedRoutes.length;

        const onRoutesSelected = async (routes: IArchivedRoute[]) => {
            await this.setSelectedRoutes(routes);
        };

        const onNew = () => { 
            this.setState({ isEditing: true }); 
        }

        const onMultipleNew = async () => { 
            this.setState({ isEditing: false, isSaving: true }); 
            await this.CopyAndSaveSelectedRoutes();
            this.setState({ isSaving: false }); 
        }

        const onEdit = () => { 
            this.setState({ isEditing: true }); 
        }

        const onSplit = async () => { 
            this.setState({ isEditing: false, isSaving: true }); 
            await this.SplitRoute();
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

        const onSave = async (newRoute: IArchivedRoute): Promise<any> => {
            this.setState({ isEditing: false, isSaving: true }); 
            await this.SaveRoute(newRoute);
            this.setState({isSaving: false});
        }

        const onCancel = (): Promise<void> => {
            this.setState({ isEditing: false }); 
            return Promise.resolve()
        }

        // TODO Move to service
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

        return [
            <Container className={this.props.app.containerClassName()} key='manageroutes' fluid={true}>
                <h1 key="title">Manage Routes</h1>
                {isLoading && <FullWidthLoading />}
                {!isLoading &&
                    <Container key='form' fluid={true}>
                        <Row>
                            <Col sm={6} md={6}>
                                <ManageRoutesTable 
                                    routes={this.state.routes} 
                                    enableSorting={true}
                                    onRoutesSelected={onRoutesSelected}
                                    markerLatLng={this.state.makerLatLng}
                                />  
                               <FormText color="muted"><FaRegHandPointUp/> CTRL/CMD-click to select multiple routes</FormText>
                            </Col>
                            <Col sm={6} md={6}>
                                <Row>
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
                                </Row>
                                <Row>
                                    <Accordian key='routes' id='routes' className='trip-section' headerClassName='trip-section-header'
                                        title={
                                            <span>
                                                {routesSelectedCount === 0 && !this.state.isLoadingRoute && <FormText color="muted">No routes selected</FormText>}
                                                {this.state.isLoadingRoute && <span className='fa fa-spinner fa-spin' key='spinner'/>}
                                                <b>{this.state.mergedRoutes.title}</b>
                                            </span>
                                        }
                                        expanded={true}>
                                        {this.state.mergedRoutes.description}
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
                                        archivedRoutesById={this.archivedRoutesById}
                                        getArchivedRoute={getArchivedRoute}
                                        readOnly={this.state.isLoadingRoute}
                                        onBoundsChanged={onBoundsChanged}
                                        onMarkerMoved={onMarkerMoved}
                                    />
                                </Row>
                            </Col>
                        </Row>
                    </Container>
                }
            </Container>
        ]
    }

    private async setSelectedRoutes(routes: IArchivedRoute[]): Promise<void> {
        this.setState({isLoadingRoute: true});
        const promises: Array<Promise<void>> = routes.map((route: IArchivedRoute) => this.fillRouteDetails(route));
        await Promise.all(promises)
        .then(() => {
            const mergedRoutes = this.mergeRoutes(routes);
            this.setState({selectedRoutes: routes, mergedRoutes});
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
        const apiMethod = 
            route?.source === 'Routes' ? "/routes/" + route.id :
            route?.source === 'CtcRoutes' ? "/routesroutearchive/" + route.ctcRoutesId :
            route?.source === 'TripHub' ? "/routestriphub/" + route.tripHubId :
            route?.source === 'TripReports' ? "/routestripreports/" + route.tripReportsId :
            null;

        if (apiMethod == null) {
            return undefined;
        }

        const response: IArchivedRoute[] = await this.props.app.triphubApiCall('GET', BaseUrl + apiMethod);
        if (!response?.length) {
            return undefined;
        }
        const detailedRoute = response[0];
        if (!detailedRoute.routes && detailedRoute.gpx) {
            const routesFromGpx = await this.importGpx(detailedRoute.gpx);
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

    private calculateBounds(routes: Array<Array<[number, number]>>): Array<[number, number]> {
        if (routes.length === 0 || routes[0].length === 0) {
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

    private importGpx(gpx: string): Promise<Array<Array<[number, number]>> | undefined> {

        // HACK - UTF-16 BOM - remove, otherwise gpzx.parse won't work
        if (gpx.charCodeAt(0) === 65279) {
            gpx = gpx.substr(1);
        }

        return new Promise<Array<Array<[number, number]>> | undefined>((resolve, reject) => {
            const routes: Array<Array<[number, number]>> = [];
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
                reject(undefined);
            });
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
            description: this.concatValues(routes.map(route => route.description), "\r\r"),
            date: this.singleValue(routes.map(route => route.date)),
            creationDate: (new Date()).toISOString().substr(0, 10),
            gpxFilename: this.singleValue(routes.map(route => route.gpxFilename)),
            gpx: this.singleValue(routes.map(route => route.gpx)),
            bounds: this.mergeBounds(routes.map(route => route.bounds)),
            routes: this.concatArrays(routes.map(route => route.routes ?? [])), 
            summarizedRoutes: this.concatArrays(routes.map(route => route.summarizedRoutes ?? [])), 
            firstName: this.singleValue(routes.map(route => route.firstName)),
            lastName: this.singleValue(routes.map(route => route.lastName))
        };
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

    private async CopyAndSaveSelectedRoutes(): Promise<any> {
        this.state.selectedRoutes.forEach(async (route: IArchivedRoute) => {
            await this.SaveRoute(this.copyRoute(route));
        });
        return Promise.resolve();
    }

    private async SplitRoute(): Promise<any> {
        this.state.mergedRoutes.routes.forEach(async (route: Array<[number, number]>, index: number) => {
            const newRoute = this.copyRoute(this.state.mergedRoutes);
            newRoute.routes = [route];
            newRoute.summarizedRoutes = [newRoute.summarizedRoutes[index]];
            newRoute.bounds = this.calculateBounds(newRoute.routes);
            await this.SaveRoute(newRoute);
        });
        return Promise.resolve();
    }

    private async SaveRoute(newRoute: IArchivedRoute): Promise<any> {
        let response: IArchivedRoute[];
        if (newRoute.id > 0) {
            response = await this.app.triphubApiCall('PUT', BaseUrl + '/routes/' + newRoute.id, newRoute );
        } else {
            response = await this.app.triphubApiCall('POST', BaseUrl + '/routes', newRoute );
        }
        if (response && response.length > 0) {
            response.forEach((route: IArchivedRoute) => {
                route.source = "Routes";
            })
            this.setState({
                routes: response.concat(this.state.routes)
            });
            await this.setSelectedRoutes(response);
        }
        return Promise.resolve()
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
