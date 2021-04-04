import * as L from 'leaflet';
import * as React from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, ListGroup, ListGroupItem, Col, Row, FormText, ButtonDropdown, DropdownItem, DropdownToggle, DropdownMenu, Form, Container } from 'reactstrap';
import { MapEditor } from './MapEditor/MapEditor';
import Button from 'reactstrap/lib/Button';
import { IMap, IArchivedRoute } from './Interfaces';
import { ResizableBox, ResizeCallbackData } from 'react-resizable';
import { ControlWrapper } from './Control';
import { MapCommon } from './MapCommon';

export class TripMap extends MapCommon<{
    routesId : string, 
    routesLabel : string,
    mapsId : string, 
    mapsLabel : string,
    hidden? : boolean,
    readOnly? : boolean,
    isLoading: boolean,
    list? : any,
    onGet: (id: string) => any,
    onSave: (id: string, value: any) => Promise<void>,
    onGetValidationMessage?: (id: string) => string,
    leafletMapId: string,
    nz50MapsBySheet: { [mapSheet: string] : IMap },
    archivedRoutesById: { [archivedRouteId: number] : IArchivedRoute },
    getArchivedRoute: (routeId: number) => Promise<IArchivedRoute | undefined>, // TODO - replace with service
    updateArchivedRouteSummary: (routeId: number, routeSummary: string) => Promise<void>
},{
    saving : boolean,
    mapVisible: boolean,
    editing: boolean,
    editsMade: boolean,
    cancelDropdownOpen: boolean
}>{
    // selected map sheets
    private pendingMapSheets: string[] = []; // changed mapSheets before being saved

    // routes
    private pendingRoutesLatLngs: Array<Array<[number, number]>> = [];  // changed routes before being saved


    constructor(props:any) {
        super(props);

        const routesAsLatLngs: Array<Array<[number, number]>> = this.getRoutes();
        this.mapSheets = this.getMapSheets();

        this.pendingRoutesLatLngs = routesAsLatLngs || [];
        this.pendingMapSheets = this.mapSheets;

        this.state = { 
            saving: false,
            mapVisible: routesAsLatLngs && routesAsLatLngs.length > 0,
            editing: false,
            editsMade: false,
            cancelDropdownOpen: false
        };
    }

    public componentDidMount() {
        if (this.state.mapVisible) {
            this.setUpMap();
        }
    }

   public render(){

        const onEdit = () => { 
            this.setState({ editsMade: false, editing: true }); 
        }

        const onMapSheetsChanged = (mapSheets: string[]) => {
            this.pendingMapSheets = mapSheets;
            this.setState({ editsMade: true });
        }
        const onRoutesChanged = (routesAsLatLngs: Array<Array<[number, number]>>) => {
            this.pendingRoutesLatLngs = routesAsLatLngs;
            this.setState({ editsMade: true });
        }

        const onSave = () => { 
            const mapVisible: boolean = this.pendingRoutesLatLngs && this.pendingRoutesLatLngs.length > 0;
            this.setState({ 
                mapVisible
            }, async () => {
                if (mapVisible) {
                    this.setUpMap();
                }
                this.mapSheets = this.pendingMapSheets;
    
                this.setRoutesFromLatLngs(this.pendingRoutesLatLngs);

                this.fitBounds();
    
                this.setState({ editsMade: false, editing: false });

                this.setState({saving: true});
                this.saveMapChanges(this.pendingMapSheets, this.pendingRoutesLatLngs)
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

        return (
            <div>
                <Row>
                    <Col sm={'auto'}>
                        <ControlWrapper id={this.props.routesId} label={this.props.routesLabel} hidden={this.props.hidden} isLoading={this.props.isLoading} onGetValidationMessage={this.props.onGetValidationMessage} saving={this.state.saving} >
                        { this.state.mapVisible &&
                            <ResizableBox width={this.initialWidth} height={this.initialHeight} minConstraints={[200, 200]} onResize={onResize}>
                                <div id="tripmap"/>
                            </ResizableBox>
                        }
                        { !this.state.mapVisible &&
                            <FormText color="muted">No routes specified</FormText>
                        }
                        </ControlWrapper>
                    </Col>
                    <Col sm={4}>
                        <ControlWrapper id={this.props.mapsId} label={this.props.mapsLabel} hidden={this.props.hidden} isLoading={this.props.isLoading} onGetValidationMessage={this.props.onGetValidationMessage} saving={this.state.saving} >
                        { this.mapSheets.length > 0 &&
                            <ListGroup>
                                { this.mapSheets.map((mapSheet: string) => 
                                    <ListGroupItem sm={3} key={mapSheet} color="primary">
                                        <span className='fa fa-map'/>
                                        {' ' + this.mapSheetWithName(mapSheet)}
                                    </ListGroupItem>
                                )}
                            </ListGroup>
                        }
                        {
                            this.mapSheets.length === 0 &&
                                <FormText color="muted">No maps selected</FormText>
                        }
                        </ControlWrapper>
                    </Col>
                </Row>
                <Row>
                    <Col sm={4}>
                        <Button onClick={onEdit} hidden={this.props.readOnly}>
                            <span className='fa fa-map'/>
                            Edit Routes/Maps
                        </Button>
                        <Modal isOpen={this.state.editing} toggle={onSave} 
                            size="lg" style={{maxWidth: '1600px', width: '95%', margin: '10px auto'}} centered={true}>
                            <ModalHeader toggle={onSave}>Edit Routes/Maps</ModalHeader>
                            <ModalBody>
                                <MapEditor 
                                    nz50MapsBySheet={this.props.nz50MapsBySheet} 
                                    archivedRoutesById={this.props.archivedRoutesById}
                                    mapSheets={this.mapSheets} 
                                    routesAsLatLngs={this.getRoutesAsLatLngs()}
                                    onMapSheetsChanged={onMapSheetsChanged} 
                                    onRoutesChanged={onRoutesChanged}
                                    getArchivedRoute={this.props.getArchivedRoute} // TODO replace with service
                                    // updateArchivedRouteSummary={this.props.updateArchivedRouteSummary}
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

        this.setRoutesFromLatLngs(this.pendingRoutesLatLngs);

        this.fitBounds();
    }
    
    private getMapSheets(): string[] {
        const mapSheets: string[] = [];
        const maps: string[] = this.props.onGet("maps") || [];
        maps.forEach(map => {
            if (map && map !== "") {
                const parts = map.split(" ");
                if (parts.length > 0 && this.props.nz50MapsBySheet[parts[0]]) {
                    mapSheets.push(parts[0]);
                }
            }
        });
        return mapSheets;
    }

    private getRoutes(): Array<Array<[number, number]>> {
        return this.props.onGet("routes") as Array<Array<[number, number]>>;
    }

    private saveMapChanges = (mapSheets: string[], routesAsLatLngs: Array<Array<[number, number]>>): Promise<void> => {
        return Promise.all([
            this.props.onSave('maps', mapSheets
                .filter(mapSheet => mapSheet > "")
                .map(mapSheet => mapSheet + " " +  this.props.nz50MapsBySheet[mapSheet].name)),
            this.props.onSave('routes', routesAsLatLngs)
        ]).then(
            () => Promise.resolve(),
            () => Promise.resolve());
    }

}