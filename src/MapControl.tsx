import * as L from 'leaflet';
import * as React from 'react';
import { Component } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, ListGroup, ListGroupItem, Col, Row, FormText, ButtonDropdown, DropdownItem, DropdownToggle, DropdownMenu, Form } from 'reactstrap';
import { MapEditor } from './MapEditor';
import FormGroup from 'reactstrap/lib/FormGroup';
import Button from 'reactstrap/lib/Button';
import { IMap, IArchivedRoute } from './Interfaces';
import { ResizableBox, ResizeCallbackData } from 'react-resizable';
import { ControlWrapper } from './Control';

type NZ50MapPolygon = L.Polygon & {nz50map: { sheetCode: string }};


export class MapControl extends Component<{
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
    nz50MapsBySheet: { [mapSheet: string] : IMap },
    archivedRoutesById: { [archivedRouteId: string] : IArchivedRoute },
    getArchivedRoute: (routeId: string) => Promise<IArchivedRoute | undefined>, // TODO - replace with service
    updateArchivedRouteSummary: (routeId: string, routeSummary: string) => Promise<void>
},{
    saving : boolean,
    mapVisible: boolean,
    editing: boolean,
    editsMade: boolean,
    cancelDropdownOpen: boolean
}>{
    // the leaflet map
    private initialHeight: number = 400;
    private  initialWidth: number = 500;
    private minimap: L.Map;

    // NZ50 map sheets grid
    private nz50LayerGroup: L.LayerGroup<NZ50MapPolygon[]>;
    private nz50MarkerLayerGroup: L.LayerGroup<L.Marker[]>;
    private nz50MapPolygonsBySheet: { [mapSheet: string] : NZ50MapPolygon } = {};

    // selected map sheets
    private mapSheets: string[] = [];
    private pendingMapSheets: string[] = []; // changed mapSheets before being saved

    // routes
    private routes: L.Polyline[] = [];
    private routeMarkers: L.Marker[] = [];
    private pendingRoutesAsJson: string = '[]';  // changed routes before being saved
    private routeColours: string[] = ['red', 'magenta', 'cyan', 'yellow'];


    constructor(props:any) {
        super(props);

        const routesAsJson: string = this.getRoutes();
        this.mapSheets = this.getMapSheets();

        this.pendingRoutesAsJson = routesAsJson || '[]';
        this.pendingMapSheets = this.mapSheets;

        this.state = { 
            saving: false,
            mapVisible: routesAsJson !== undefined && routesAsJson !== '[]',
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
        const onRoutesChanged = (routesAsJson: string) => {
            this.pendingRoutesAsJson = routesAsJson;
            this.setState({ editsMade: true });
        }

        const onSave = () => { 
            const mapVisible: boolean = this.pendingRoutesAsJson !== '[]';
            this.setState({ 
                mapVisible
            }, async () => {
                if (mapVisible) {
                    this.setUpMap();
                }
                this.mapSheets = this.pendingMapSheets;
    
                this.setRoutesFromJson(this.pendingRoutesAsJson);

                this.fitBounds();
    
                this.setState({ editsMade: false, editing: false });

                this.setState({saving: true});
                this.saveMapChanges(this.pendingMapSheets, this.pendingRoutesAsJson)
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
            <Form key='routesMaps'>
                <Row>
                    <Col sm={'auto'}>
                        <ControlWrapper id={this.props.routesId} label={this.props.routesLabel} hidden={this.props.hidden} isLoading={this.props.isLoading} onGetValidationMessage={this.props.onGetValidationMessage} saving={this.state.saving} >
                        { this.state.mapVisible &&
                            <ResizableBox width={this.initialWidth} height={this.initialHeight} minConstraints={[200, 200]} onResize={onResize}>
                                <div id="minimap"/>
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
                                        <span className='fa fa-map-o'/>
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
                        <FormGroup row={true} key='mapeditor'>
                            <Button onClick={onEdit} hidden={this.props.readOnly}>
                                <span className='fa fa-map'/>
                                Edit Routes/Maps
                            </Button>
                            <Modal isOpen={this.state.editing} toggle={onSave} size="lg" style={{maxWidth: '1600px', width: '80%', margin: '10px auto'}}>
                                <ModalHeader toggle={onSave}>Edit Routes/Maps</ModalHeader>
                                <ModalBody>
                                    <MapEditor 
                                        nz50MapsBySheet={this.props.nz50MapsBySheet} 
                                        archivedRoutesById={this.props.archivedRoutesById}
                                        mapSheets={this.mapSheets} 
                                        routesAsJson={this.getRoutesAsJson()}
                                        onMapSheetsChanged={onMapSheetsChanged} 
                                        onRoutesChanged={onRoutesChanged}
                                        getArchivedRoute={this.props.getArchivedRoute} // TODO replace with service
                                        updateArchivedRouteSummary={this.props.updateArchivedRouteSummary}
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
                        </FormGroup>
                    </Col>
                </Row>
            </Form>
         );
    }

    // BJ TODO: remove 3 map limit
    private getMapSheets(): string[] {
        const mapSheets: string[] = [];
        ["map1", "map2", "map3"].forEach((mapFieldId: string) => {
            const mapSheet = this.props.onGet(mapFieldId);
            if (mapSheet && mapSheet !== "") {
                const parts = mapSheet.split(" ");
                if (parts.length > 0 && this.props.nz50MapsBySheet[parts[0]]) {
                    mapSheets.push(parts[0]);
                }
            }
        });
        return mapSheets;
    }

    private getRoutes(): string {
        return this.props.onGet("mapRoute") as string;
    }

    // BJ TODO: remove 3 map limit
    private saveMapChanges = (mapSheets: string[], routesAsJson: string): Promise<void> => {
        return Promise.all([
            this.props.onSave('map1', mapSheets.length > 0 ? mapSheets[0] + " " +  this.props.nz50MapsBySheet[mapSheets[0]].name : ""),
            this.props.onSave('map2', mapSheets.length > 1 ? mapSheets[1] + " " +  this.props.nz50MapsBySheet[mapSheets[1]].name : ""),
            this.props.onSave('map3', mapSheets.length > 2 ? mapSheets[2] + " " +  this.props.nz50MapsBySheet[mapSheets[2]].name : ""),
            this.props.onSave('mapRoute', routesAsJson)
        ]).then(
            () => Promise.resolve(),
            () => Promise.resolve());
    }
    
    private setUpMap(): void {
        // save current map height and width (if any)
        const mapHeight: number = this.currentMapHeight();
        const mapWidth: number = this.currentMapWidth();

        if (this.minimap) {
            this.minimap.off();
            this.minimap.remove();
        }

        this.minimap = L.map('minimap', {
            center: [-43.5, 172], // Central Canterbury
            zoom: 9, // Central Canterbury
            maxBounds: [[-33, 165], [-48, 179]], // New Zealand
            zoomControl: true,
            editable: true, // to enable leaflet.editable
            drawingCursor: 'crosshair',
            trackResize: false, // we handle the resizing to the ResizableBox,
            scrollWheelZoom: false
        } as L.MapOptions);

        // tslint:disable-next-line:prefer-const
        // let baseMapLayer = 
        // L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        // 	minZoom: 6,
        // 	maxZoom: 14,
        // 	attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>) | NZ Topo map sheets sourced from the LINZ Data Service and licensed for reuse under CC BY 4.0'
        // }).addTo(map);
        L.tileLayer('http://tiles-{s}.data-cdn.linz.govt.nz/services;key=6076db4a13a14365905f8914ad7e3667/tiles/v4/layer=50767/EPSG:3857/{z}/{x}/{y}.png', {
            minZoom: 6,
            maxZoom: 16,
            subdomains:'abcd',
            attribution: '<a href=“http://data.linz.govt.nz”>Sourced from LINZ. CC BY 4.0'
        }).addTo(this.minimap);
        

        this.nz50LayerGroup = L.layerGroup()
            .addTo(this.minimap);
        this.nz50MarkerLayerGroup = L.layerGroup()
            .addTo(this.minimap);

        Object.keys(this.props.nz50MapsBySheet).forEach(mapSheet => {
            const nz50Map: IMap = this.props.nz50MapsBySheet[mapSheet];

            // the map sheet polygon
            const polygon = L.polygon(nz50Map.coords, {color: 'blue', weight: 2, fill: true, fillOpacity: 0.0}).addTo(this.nz50LayerGroup);

            // the map sheet label
            const polygonLabel = L.divIcon({className: 'sheet-div-icon',
                html: '<div class="sheet-code">' + nz50Map.sheetCode + '</div><div class="sheet-name">' + nz50Map.name + '</div>'});
            // you can set .my-div-icon styles in CSS

            // ideally would centre around polygon.getCenter()...
            const markerPos = polygon.getBounds().pad(-0.25).getNorthWest();

            L.marker(markerPos, {icon: polygonLabel, interactive: false}).addTo(this.nz50MarkerLayerGroup);

            this.nz50MapPolygonsBySheet[nz50Map.sheetCode] = polygon as NZ50MapPolygon;
        });

        this.minimap.on('zoomend', () => {
            if (this.minimap.getZoom() < 9) {
                if (this.minimap.hasLayer(this.nz50MarkerLayerGroup)) {
                    this.minimap.removeLayer(this.nz50MarkerLayerGroup);
                }
            } else {
                if (!this.minimap.hasLayer(this.nz50MarkerLayerGroup)) {
                    this.minimap.addLayer(this.nz50MarkerLayerGroup);
                }
            }
        });

        this.resizeMap(mapHeight, mapWidth);

        this.setRoutesFromJson(this.pendingRoutesAsJson);

        this.fitBounds();
    }
    
    private mapSheetWithName(mapSheet: string) {
        const nz50Map: IMap = this.props.nz50MapsBySheet[mapSheet];
        return nz50Map ? nz50Map.sheetCode + ' ' + nz50Map.name : mapSheet;
    }

    private resizeMap(height: number, width: number): void {
        const layerControl: HTMLStyleElement = document.getElementById('minimap') as HTMLStyleElement;
        layerControl.style.height = Math.floor(height - 8).toString() + 'px';
        layerControl.style.width = Math.floor(width - 8).toString() + 'px';
        this.minimap.invalidateSize();
    }

    private currentMapHeight(): number {
        const layerControl: HTMLStyleElement = document.getElementById('minimap') as HTMLStyleElement;
        return layerControl.style.height ? parseInt(layerControl.style.height, 10) : this.initialHeight;
    }

    private currentMapWidth(): number {
        const layerControl: HTMLStyleElement = document.getElementById('minimap') as HTMLStyleElement;
        return layerControl.style.width ? parseInt(layerControl.style.width, 10) : this.initialWidth;
    }

    // -------------------------------------------------------
    // Routes
    // -------------------------------------------------------

    private getRoutesAsJson(): string {
        return JSON.stringify(this.routes.map((route: L.Polyline) => {
            return (route.getLatLngs() as L.LatLng[]).map((latLng: L.LatLng) => {
                return [latLng.lat, latLng.lng]
            });
        }));
    }

    private setRoutesFromJson(routesAsJson: string): void {
        this.routes.forEach((route: L.Polyline) => {
            route.remove();
        });
        this.routes = [];
        if (routesAsJson) {
            const routesLatLngs: L.LatLng[][] = JSON.parse(routesAsJson);
            routesLatLngs.forEach(routeLatLngs => {
                this.routes.push(L.polyline(routeLatLngs, {}).addTo(this.minimap));
            });
        }
        this.adjustRoutePositionIndicators();
    }

    private adjustRoutePositionIndicators() {
        this.routeMarkers.forEach((routeMarker: L.Marker) => {
            routeMarker.remove();
        });
        this.routeMarkers = [];
        if (this.routes.length > 0) {
            let index: number = 0;
            this.routes.forEach((route: L.Polyline) => {
                const color: string = this.routeColours[index % this.routeColours.length];
                route.setStyle({color});
                const latLngs: L.LatLng[] = route.getLatLngs() as L.LatLng[];
                if (latLngs.length > 0) {
                    const label: string = this.routes.length > 1 ? (index + 1).toString() : ""; // no label if only one route
                    const divIcon = L.divIcon({
                        className: 'route-marker-div-icon',
                        html: "<div style='background-color:" + color + ";' class='marker-ring'></div><i>" + label + "</i>",
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    });
                    const routeMarker = L.marker(latLngs[0], { icon: divIcon }).addTo(this.minimap);
                    this.routeMarkers.push(routeMarker);
                }
                index++;
            });
        }
    }

    private fitBounds(): void {
        let bounds: L.LatLngBounds | undefined;
        if (this.routes.length > 0) {
            this.routes.forEach((route: L.Polyline) => {
                if (!bounds) {
                    bounds = route.getBounds();
                } else {
                    bounds.extend(route.getBounds());
                }
            })
        } else {
            if (this.mapSheets.length > 0) {
                this.mapSheets.forEach((mapSheet: string) => {
                    if (this.nz50MapPolygonsBySheet[mapSheet]) {
                        if (!bounds) {
                            bounds = this.nz50MapPolygonsBySheet[mapSheet].getBounds();
                        } else {
                            bounds.extend(this.nz50MapPolygonsBySheet[mapSheet].getBounds());
                        }
                    }
                });
            }
        }
        if (bounds) {
            this.minimap.fitBounds(bounds);
        }
    }

}