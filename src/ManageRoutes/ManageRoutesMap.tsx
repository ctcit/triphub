import * as React from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Col, Row, ButtonDropdown, DropdownItem, DropdownToggle, DropdownMenu } from 'reactstrap';
import Button from 'reactstrap/lib/Button';
import { IMap, IArchivedRoute } from '../Interfaces';
import { ResizableBox, ResizeCallbackData } from 'react-resizable';
import { MapCommon } from '../MapCommon';
import { ManageRoutesMapEditor } from './ManageRoutesMapEditor';
import * as L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

export class RouteDetails {
    public title: string;
    public date: string;
    public description : string;
}

export enum MapOperation { None, MoveMarker, ZoomExtents }

export class ManageRoutesMap extends MapCommon<{
    readOnly? : boolean,
    route: IArchivedRoute,
    onSave: (route?: IArchivedRoute) => Promise<void>,
    onCancel: () => Promise<void>,
    isEditing: boolean,
    leafletMapId: string,
    nz50MapsBySheet: { [mapSheet: string] : IMap },
    getArchivedRoutes: (includeHidden: boolean, force: boolean) => Promise<IArchivedRoute[]>,
    getArchivedRoute: (routeId: number) => Promise<IArchivedRoute | undefined>, // TODO - replace with service
    onBoundsChanged: (bounds: L.LatLngBounds) => void;
    onMarkerMoved: (latLng: L.LatLng) => void;
    mapOperation: MapOperation
},{
    isSaving : boolean,
    cancelDropdownOpen: boolean
}>{
    private pendingRouteDetails: RouteDetails; // changed details before being saved
    private pendingRoutesLatLngs: Array<Array<[number, number]>>;  // changed routes before being saved

    private mapMarker: L.Marker<any>;

    constructor(props:any) {
        super(props);

        this.state = { 
            isSaving: false,
            cancelDropdownOpen: false
        };
    }

    public componentDidMount() {
        this.setUpMap();
    }

    public render() {

        this.pendingRouteDetails = {
            title: this.props.route.title,
            date: this.props.route.date,
            description: this.props.route.description
        };
        this.pendingRoutesLatLngs = this.props.route.routes;

        const onDetailsChanged = async (routeDetails: RouteDetails) => {
            this.pendingRouteDetails = routeDetails;
        }

        const onRoutesChanged = (routesAsLatLngs: Array<Array<[number, number]>>) => {
            this.pendingRoutesLatLngs = routesAsLatLngs;
        }

        const onSave = () => { 

            const route: IArchivedRoute = this.props.route;
            Object.assign(route, this.pendingRouteDetails); // copy routeDetails to route
            route.routes = this.pendingRoutesLatLngs;
            
            this.setState({ 
            }, async () => {
                this.setUpMap();
                this.setRoutesFromLatLngs(route.routes);

                this.fitBounds();
    
                this.setState({isSaving: true});
                this.props.onSave(route)
                    .then(() => this.setState({isSaving: false}));
            }); 
        }
        const onCancel = () => { 
            this.props.onCancel();
        }
        const onCancelDropdownToggle = () => {
            this.setState({ cancelDropdownOpen: !this.state.cancelDropdownOpen }); 
        }

        const onResize = (e: React.SyntheticEvent, data: ResizeCallbackData) => {
            this.resizeMap(data.size.height, data.size.width);
        }

        this.setRoutesFromLatLngs((this.pendingRoutesLatLngs) as Array<Array<[number, number]>>);

        switch (this.props.mapOperation) {
            case MapOperation.MoveMarker:
                this.mapMarker.setLatLng(this.map.getCenter());
                break;
            case MapOperation.ZoomExtents:
                this.fitBounds();
                break;
        }

        const getArchivedRoutes = (includeHidden: boolean, force: boolean): Promise<IArchivedRoute[]> => 
            this.props.getArchivedRoutes(includeHidden, force);
        const getArchivedRoute = (routeId: number): Promise<IArchivedRoute | undefined> => 
            this.props.getArchivedRoute(routeId);

        return (
            <div>
                <Row>
                    <Modal isOpen={this.props.isEditing} toggle={onSave}
                        size="xl" style={{maxWidth: '1600px', width: '95%', margin: '10px auto'}} centered={true}>
                        <ModalHeader toggle={onSave}>New Route</ModalHeader>
                        <ModalBody>
                            <ManageRoutesMapEditor 
                                nz50MapsBySheet={this.props.nz50MapsBySheet} 
                                routeDetails={this.pendingRouteDetails}
                                routesAsLatLngs={this.pendingRoutesLatLngs}
                                onDetailsChanged={onDetailsChanged}
                                onRoutesChanged={onRoutesChanged}
                                getArchivedRoutes={getArchivedRoutes}
                                getArchivedRoute={getArchivedRoute}
                            />
                        </ModalBody>
                        <ModalFooter>
                            { <Button color="primary" onClick={onSave}>Save</Button> }
                            { <ButtonDropdown color="secondary" drop={'right'} isOpen={this.state.cancelDropdownOpen} toggle={onCancelDropdownToggle}>
                                <DropdownToggle caret={false}>Cancel</DropdownToggle>
                                <DropdownMenu>
                                    <DropdownItem color="red" onClick={onCancel}>Confirm discard changes</DropdownItem>
                                </DropdownMenu>
                              </ButtonDropdown>
                            }
                        </ModalFooter>
                    </Modal>
                </Row>
                <Row>
                    <Col sm={'auto'}>
                        <ResizableBox width={this.initialWidth} height={this.initialHeight} minConstraints={[200, 200]} onResize={onResize}>
                            <div id="manageroutesmap"/>
                        </ResizableBox>
                    </Col>
                </Row>
            </div>
         );
    }

    public setUpMap(): void {
        // save current map height and width (if any)
        const mapHeight: number = this.currentMapHeight();
        const mapWidth: number = this.currentMapWidth();

        if (this.map) {
            this.map.off();
            this.map.remove();
        }

        super.setUpMap();

        this.map.on('moveend', (e) => {
            this.props.onBoundsChanged(this.map.getBounds());
         });

        this.resizeMap(mapHeight, mapWidth);

        const zServiceStationLatLng = new L.LatLng(-43.5191470506675, 172.62654304504397);
        this.mapMarker = L.marker(zServiceStationLatLng, {
            icon: L.icon({
                iconUrl: icon,
                shadowUrl: iconShadow
            }),
            draggable: true,
            autoPan: true
        }).addTo(this.map)
        .on('move', (e) => {
            this.props.onMarkerMoved((e as any).latlng as L.LatLng)
        });

        this.props.onMarkerMoved(this.mapMarker.getLatLng())
    }

}