import * as React from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Col, Row, ButtonDropdown, DropdownItem, DropdownToggle, DropdownMenu } from 'reactstrap';
import Button from 'reactstrap/lib/Button';
import { IMap, IArchivedRoute } from '../Interfaces';
import { ResizableBox, ResizeCallbackData } from 'react-resizable';
import { MapCommon } from '../MapCommon';
import { ManageRoutesMapEditor } from './ManageRoutesMapEditor';

export class RouteDetails {
    public title: string;
    public description : string;
}

export class ManageRoutesMap extends MapCommon<{
    readOnly? : boolean,
    route: IArchivedRoute,
    onSave: (route: IArchivedRoute) => Promise<void>,
    leafletMapId: string,
    nz50MapsBySheet: { [mapSheet: string] : IMap },
    archivedRoutesById: { [archivedRouteId: string] : IArchivedRoute },
    getArchivedRoute: (routeId: string) => Promise<IArchivedRoute | undefined> // TODO - replace with service
},{
    saving : boolean,
    editing: boolean,
    editsMade: boolean,
    cancelDropdownOpen: boolean
}>{
    private pendingRouteDetails: RouteDetails = {
        title: "",
        description: ""
    }; // changed details before being saved
    private pendingRoutesLatLngs: Array<Array<[number, number]>> = [];  // changed routes before being saved

    constructor(props:any) {
        super(props);

        const routesAsLatLngs: Array<Array<[number, number]>> = this.getRoutes();
        this.pendingRoutesLatLngs = routesAsLatLngs || [];

        this.state = { 
            saving: false,
            editing: false,
            editsMade: false,
            cancelDropdownOpen: false
        };
    }

    public componentDidMount() {
        this.setUpMap();
    }

   public render(){
        const onEdit = () => { 
            this.setState({ editsMade: false, editing: true }); 
        }

        const onDetailsChanged = async (routeDetails: RouteDetails) => {
            const pendingRoute = this.pendingRouteDetails;
            pendingRoute.title = routeDetails.title;
            pendingRoute.description = routeDetails.description;
            this.setState({ editsMade: true });
        }

        const onRoutesChanged = (routesAsLatLngs: Array<Array<[number, number]>>) => {
            this.pendingRoutesLatLngs = routesAsLatLngs;
            this.setState({ editsMade: true });
        }

        const onSave = () => { 
            // const mapVisible: boolean = this.pendingRoutesLatLngs && this.pendingRoutesLatLngs.length > 0;
            this.setState({ 
            }, async () => {
                this.setUpMap();
                this.setRoutesFromLatLngs(this.pendingRoutesLatLngs);

                this.fitBounds();
    
                this.setState({ editsMade: false, editing: false });

                this.setState({saving: true});
                this.saveRouteChanges(this.pendingRouteDetails, this.pendingRoutesLatLngs)
                    .then(() => this.setState({saving: false}));
            }); 
        }
        const onCancel = () => { 
            this.setState({ editsMade: false, editing: false }); 
        }
        const onCancelDropdownToggle = () => {
            this.setState({ cancelDropdownOpen: !this.state.cancelDropdownOpen }); 
        }

        const onResize = (e: React.SyntheticEvent, data: ResizeCallbackData) => {
            this.resizeMap(data.size.height, data.size.width);
        }

        this.setRoutesFromLatLngs((this.getRoutes() ?? []) as Array<Array<[number, number]>>);

        this.fitBounds();

        return (
            <div>
                <Row>
                    <Col sm={'auto'}>
                        <ResizableBox width={this.initialWidth} height={this.initialHeight} minConstraints={[200, 200]} onResize={onResize}>
                            <div id="manageroutesmap"/>
                        </ResizableBox>
                    </Col>
                </Row>
                <Row>
                    <Col sm={4}>
                        <Button onClick={onEdit} hidden={this.props.readOnly}>
                            <span className='fa fa-map'/>
                            Edit Route
                        </Button>
                        <Modal isOpen={this.state.editing} toggle={onSave}
                            size="xl" style={{maxWidth: '1600px', width: '95%', margin: '10px auto'}} centered={true}>
                            <ModalHeader toggle={onSave}>Edit Route</ModalHeader>
                            <ModalBody>
                                <ManageRoutesMapEditor 
                                    nz50MapsBySheet={this.props.nz50MapsBySheet} 
                                    archivedRoutesById={this.props.archivedRoutesById}
                                    routeDetails={this.getRouteDetails()}
                                    routesAsLatLngs={this.getRoutesAsLatLngs()}
                                    onDetailsChanged={onDetailsChanged}
                                    onRoutesChanged={onRoutesChanged}
                                    getArchivedRoute={this.props.getArchivedRoute} // TODO replace with service
                                />
                            </ModalBody>
                            <ModalFooter>
                                { !this.state.editsMade && <Button color="secondary" onClick={onCancel}>Close</Button> }                                    
                                { this.state.editsMade && <Button color="primary" onClick={onSave}>Save</Button> }
                                { this.state.editsMade && 
                                    <ButtonDropdown color="secondary" drop={'right'} isOpen={this.state.cancelDropdownOpen} toggle={onCancelDropdownToggle}>
                                        <DropdownToggle caret={false}>Cancel</DropdownToggle>
                                        <DropdownMenu>
                                            <DropdownItem color="red" onClick={onCancel}>Confirm discard changes</DropdownItem>
                                        </DropdownMenu>
                                    </ButtonDropdown>
                                }
                            </ModalFooter>
                        </Modal>
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

        this.resizeMap(mapHeight, mapWidth);
    }
    
    private getRouteDetails(): RouteDetails {
        return {
            title: this.props.route.title,
            description: this.props.route.description
        };
    }

    private getRoutes(): Array<Array<[number, number]>> {
        return this.props.route.routes;
    }

    private saveRouteChanges = (routeDetails: RouteDetails, routesAsLatLngs: Array<Array<[number, number]>>): Promise<void> => {
        const route: IArchivedRoute = this.props.route;
        Object.assign(routeDetails, route); // copy routeDetails to route
        route.routes = routesAsLatLngs;
        return this.props.onSave(route);
    }

}