import * as React from 'react';
import { Component } from 'react';
import { Container, Row, Col } from 'reactstrap';
import { BaseUrl } from '..';
import { App } from '../App';
import { IArchivedRoute, IMap } from '../Interfaces';
import '../index.css';
import '../print.css';
import { FullWidthLoading, Spinner } from '../Widgets';
import { ManageRoutesMap } from './ManageRoutesMap';
import { ManageRoutesTable } from './ManageRoutesTable';
import 'leaflet-gpx';
import * as L from 'leaflet';

export class ManageRoutes extends Component<{
    app: App,
    }, {
        isSaving: boolean,
        isLoading: boolean,
        routes: IArchivedRoute[]
        isLoadingRoute: boolean,
        selectedRoutes: IArchivedRoute[]
        mergedRoutes: IArchivedRoute,
    }> {

    public app : App;
    private nz50MapsBySheet: { [mapSheet: string] : IMap } = {};
    private archivedRoutesById: { [archivedRouteId: string] : IArchivedRoute } = {};

    constructor(props:any){
        super(props)
        this.state = {
            isSaving: false,
            isLoading: true,
            routes: [],
            isLoadingRoute: false,
            selectedRoutes: [],
            mergedRoutes: this.mergeRoutes([])
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

    public render(){

        const {isLoading} = this.state

        const onRoutesSelected = (routes: IArchivedRoute[]) => {
            this.setSelectedRoutes(routes);
        };

        // TODO Move to service
        const getArchivedRoute = (archivedRouteId: string): Promise<IArchivedRoute | undefined> =>  {
            return this.app.triphubApiCall('GET', BaseUrl + '/routes/' + archivedRouteId )
                .then((response: IArchivedRoute[]) => response !== null && response.length > 0 ? response[0] : undefined);  
        }

        // const updateArchivedRouteSummary = (archivedRouteId: string, routeSummary: string): Promise<void> =>  {
        //     return this.app.triphubApiCall('PATCH', BaseUrl + '/routes/' + archivedRouteId, routeSummary );  
        // }

        const onSave = (route: IArchivedRoute): Promise<any> => {
            if (route.id) {
                return this.app.triphubApiCall('PUT', BaseUrl + '/routes/' + route.id, route )
                    .then((response: IArchivedRoute[]) => response !== null && response.length > 0 ? response[0] : undefined);  
            } else {
                return this.app.triphubApiCall('POST', BaseUrl + '/routes', route )
                    .then((response: IArchivedRoute[]) => response !== null && response.length > 0 ? response[0] : undefined);  

            }
            return Promise.resolve()
        }

        const onGetValidationMessage = (): any => {
            return null;
        }

        return [
            <Container className={this.props.app.containerClassName()} key='manageroutes' fluid={true}>
                <h1 key="title">Manage Routes</h1>
                {isLoading && <FullWidthLoading />}
                {!isLoading &&
                    <Container key='form' fluid={true} className='my-3'>
                        <Row>
                            <Col sm={6} md={6}>
                                <ManageRoutesTable 
                                    routes={this.state.routes} 
                                    enableSorting={true}
                                    onRoutesSelected={onRoutesSelected}
                                />  
                            </Col>
                            <Col sm={6} md={6}>
                                {this.state.isLoadingRoute && <FullWidthLoading />}
                                {!this.state.isLoadingRoute && 
                                    <Row>
                                        <Col md={9}>
                                            <b>{this.state.mergedRoutes.title}</b>
                                        </Col>
                                        <Col md={3}>
                                            <b>{this.state.mergedRoutes.source}</b>
                                        </Col>
                                    </Row>
                                }
                                <Row>
                                    <ManageRoutesMap 
                                        route={this.state.mergedRoutes}
                                        onSave={onSave}
                                        leafletMapId='manageroutesmap'
                                        nz50MapsBySheet={this.nz50MapsBySheet} 
                                        archivedRoutesById={this.archivedRoutesById}
                                        getArchivedRoute={getArchivedRoute}
                                        readOnly={this.state.isLoadingRoute}
                                    />
                                </Row>
                                <Row>
                                    {this.state.mergedRoutes.description}
                                </Row>
                            </Col>
                        </Row>
                    </Container>
                }
            </Container>
        ]
    }

    private setSelectedRoutes(routes: IArchivedRoute[]): void {
        this.setState({isLoadingRoute: true});
        const promises: Array<Promise<void>> = routes.map((route: IArchivedRoute) => this.fillRouteDetails(route));
        Promise.all(promises)
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
                detailedRoute.bounds = this.bounds(detailedRoute.routes);
            }
            if (!detailedRoute.summarizedRoutes || detailedRoute.summarizedRoutes.length === 0) {
                detailedRoute.summarizedRoutes = this.summarizedRoutes(detailedRoute.routes);
            }
        }
        return detailedRoute;
}

    private bounds(routes: Array<Array<[number, number]>>): Array<[number, number]> {
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

    private mergeRoutes(routes: IArchivedRoute[]): IArchivedRoute {
        return {
            id: "",
            memberId: this.singleValue(routes.map(route => route.memberId)), 
            tripHubId: this.singleValue(routes.map(route => route.tripHubId)),
            ctcRoutesId: this.singleValue(routes.map(route => route.ctcRoutesId)),
            tripReportsId: this.singleValue(routes.map(route => route.tripReportsId)),
            source: "Routes",
            title: this.concatValues(routes.map(route => route.title), "; "),
            description: this.concatValues(routes.map(route => route.description), "\r\r"),
            date: this.singleValue(routes.map(route => route.date)),
            creationDate: "",
            gpxFilename: this.singleValue(routes.map(route => route.gpxFilename)),
            gpx: this.singleValue(routes.map(route => route.gpx)),
            bounds: this.mergeBounds(routes.map(route => route.bounds)),
            routes: this.concatArrays(routes.map(route => route.routes ?? [])), 
            summarizedRoutes: this.concatArrays(routes.map(route => route.summarizedRoutes ?? [])), 
            firstName: this.singleValue(routes.map(route => route.firstName)),
            lastName: this.singleValue(routes.map(route => route.lastName)),
            };
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
        return this.bounds(routesBounds);
    }
}
