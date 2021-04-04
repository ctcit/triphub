import * as React from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Col, Row, ButtonDropdown, DropdownItem, DropdownToggle, DropdownMenu, ButtonGroup } from 'reactstrap';
import Button from 'reactstrap/lib/Button';
import { IMap, IArchivedRoute } from '../Interfaces';
import { ResizableBox, ResizeCallbackData } from 'react-resizable';
import { MapCommon } from '../MapCommon';
import { ManageRoutesMapEditor } from './ManageRoutesMapEditor';
import { ButtonWithTooltip } from 'src/ButtonWithTooltip';
import { MdAddCircle, MdClear, MdEdit } from 'react-icons/md';

export class RouteDetails {
    public title: string;
    public description : string;
}

export class ManageRoutesMap extends MapCommon<{
    readOnly? : boolean,
    route: IArchivedRoute,
    onSave: (route: IArchivedRoute) => Promise<void>,
    onDelete: (route: IArchivedRoute) => Promise<void>,
    leafletMapId: string,
    nz50MapsBySheet: { [mapSheet: string] : IMap },
    archivedRoutesById: { [archivedRouteId: number] : IArchivedRoute },
    getArchivedRoute: (routeId: number) => Promise<IArchivedRoute | undefined>, // TODO - replace with service
    onBoundsChanged: (bounds: L.LatLngBounds) => void;
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

        this.pendingRoutesLatLngs = [];

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

   public render() {
       const singleArchivedRouteSelected = this.props.route?.id > 0;

        const onNew = () => { 
            this.setState({ editsMade: false, editing: true }); 
        }

        const onEdit = () => { 
            this.setState({ editsMade: false, editing: true }); 
        }

        const onDelete = async () => { 
            // BJ TODO Delete check
            await this.props.onDelete(this.props.route);
            this.setState({ editsMade: false, editing: false }); 
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

        this.pendingRoutesLatLngs = this.getRoutes() || [];
        this.setRoutesFromLatLngs((this.pendingRoutesLatLngs) as Array<Array<[number, number]>>);

        this.fitBounds();

        return (
            <div>
                <Row>
                    <Col sm={8}>
                        <ButtonGroup>
                            <ButtonWithTooltip id="NewRouteButton" color='secondary' 
                                onClick={onNew} disabled={false} 
                                placement="top" tooltipText="Create a new route from selected routes (create empty, if none selected)">
                                <MdAddCircle/>
                                New
                            </ButtonWithTooltip>
                            <ButtonWithTooltip id="EditRouteButton" color='secondary' 
                                onClick={onEdit} disabled={!singleArchivedRouteSelected}  
                                placement="top" tooltipText="Edit the selected route">
                                <MdEdit/>
                                Edit
                            </ButtonWithTooltip>
                            <ButtonWithTooltip id="DeleteRouteButton" color='secondary' 
                                onClick={onDelete} disabled={!singleArchivedRouteSelected}  
                                placement="top" tooltipText="Delete the selected route">
                                <MdClear/>
                                Delete
                            </ButtonWithTooltip>
                        </ButtonGroup>
                    </Col>
                    <Modal isOpen={this.state.editing} toggle={onSave}
                        size="xl" style={{maxWidth: '1600px', width: '95%', margin: '10px auto'}} centered={true}>
                        <ModalHeader toggle={onSave}>New Route</ModalHeader>
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