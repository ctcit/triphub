import * as L from 'leaflet';
import * as React from 'react';
import { Component } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, ListGroup, ListGroupItem, Col, Row, FormText } from 'reactstrap';
import { MapEditor } from './MapEditor';
import FormGroup from 'reactstrap/lib/FormGroup';
import Button from 'reactstrap/lib/Button';
import { IMap, IArchivedRoute } from './Interfaces';
import { ResizableBox, ResizeCallbackData } from 'react-resizable';

type NZ50MapPolygon = L.Polygon & {nz50map: { sheetCode: string }};

export class MapControl extends Component<{
    readOnly: boolean,
    nz50MapsBySheet: { [mapSheet: string] : IMap },
    archivedRoutesById: { [archivedRouteId: string] : IArchivedRoute },
    mapSheets: string[],
    routesAsJson: string,
    saveMapChanges: (mapSheets: string[] | undefined, routesAsJson: string | undefined) => Promise<void>,
    getArchivedRoute: (routeId: string) => Promise<IArchivedRoute | undefined> // TODO - replace with service
},{
    mapVisible: boolean,
    editing: boolean,
    editsMade: boolean
}>{
    // the leaflet map
    private initialHeight: number = 250;
    private  initialWidth: number = 250;
    private minimap: L.Map;
    private mapInitialized: boolean = false;

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
    private pendingRoutesAsJson: string;  // changed routes before being saved
    private routeColours: string[] = ['red', 'magenta', 'cyan', 'yellow'];


    constructor(props:any) {
        super(props);

        this.state = { 
            mapVisible: this.props.mapSheets.length > 0 || Boolean(this.props.routesAsJson),
            editing: false,
            editsMade: false
        };
        this.mapSheets = this.props.mapSheets;

        this.pendingRoutesAsJson = this.props.routesAsJson;
        this.pendingMapSheets = this.props.mapSheets;
    }

    public componentDidMount() {
        if (this.state.mapVisible) {
            this.setUpMap();
        }
    }

    public render(){
        const onEdit = () => { 
            this.setState({ editing: true }); 
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
            const mapVisible: boolean = this.pendingMapSheets.length > 0 || Boolean(this.pendingRoutesAsJson);
            this.setState({ 
                mapVisible
            }, async () => {
                if (mapVisible) {
                    this.setUpMap();
                }
                this.unshowSelectedMaps();
                this.mapSheets = this.pendingMapSheets;
                this.showSelectedMaps();
    
                this.setRoutesFromJson(this.pendingRoutesAsJson);

                this.fitBounds();
    
                this.setState({ 
                    editing: false,
                });

                await this.props.saveMapChanges(
                    this.pendingMapSheets.length > 0 ? this.pendingMapSheets : undefined,
                    Boolean(this.pendingRoutesAsJson) ? this.pendingRoutesAsJson : undefined );
            }); 

        }
        const onCancel = () => { 
            this.setState({ editing: false }); 
        }

        const onResize = (e: React.SyntheticEvent, data: ResizeCallbackData) => {
            this.resizeMap(data.size.height, data.size.width);
        }

        return (
            <FormGroup>
                <Row>
                    <Col sm={'auto'}>
                    { this.state.mapVisible &&
                        <ResizableBox width={this.initialWidth} height={this.initialHeight} minConstraints={[200, 200]} onResize={onResize}>
                            <div id="minimap"/>
                        </ResizableBox>
                    }
                    { !this.state.mapVisible &&
                            <FormText color="muted">No routes specified</FormText>
                    }
                    </Col>
                    <Col sm={4}>
                    {
                        this.mapSheets.length > 0 &&
                            <ListGroup>
                                { this.mapSheets.map((mapSheet: string) => 
                                    <ListGroupItem sm={3} key={mapSheet} color="primary">{this.mapSheetWithName(mapSheet)}</ListGroupItem>
                                )}
                            </ListGroup>
                    }
                    {
                        this.mapSheets.length === 0 &&
                            <FormText color="muted">No maps selected</FormText>
                    }
                    </Col>
                    <Col sm={2}>
                        <FormGroup row={true} key='mapeditor'>
                            <Button onClick={onEdit} hidden={this.props.readOnly}>Edit</Button>
                            <Modal isOpen={this.state.editing} toggle={onSave} size="lg" style={{maxWidth: '1600px', width: '80%', margin: '10px auto'}}>
                                <ModalHeader toggle={onSave}>Maps and Routes</ModalHeader>
                                <ModalBody>
                                    <MapEditor 
                                        nz50MapsBySheet={this.props.nz50MapsBySheet} 
                                        archivedRoutesById={this.props.archivedRoutesById}
                                        mapSheets={this.mapSheets} 
                                        routesAsJson={this.getRoutesAsJson()}
                                        onMapSheetsChanged={onMapSheetsChanged} 
                                        onRoutesChanged={onRoutesChanged}
                                        getArchivedRoute={this.props.getArchivedRoute} // TODO replace with service
                                    />
                                </ModalBody>
                                <ModalFooter>
                                    <Button color="primary" onClick={onSave} disabled={!this.state.editsMade}>Save</Button>{' '}
                                    <Button color="secondary" onClick={onCancel}>Cancel</Button>
                                </ModalFooter>
                            </Modal>
                        </FormGroup>
                    </Col>
                </Row>
            </FormGroup>
        );
    }

    private setUpMap(): void {
        if (!this.mapInitialized ) {
            this.minimap = L.map('minimap', {
                center: [-43.5, 172], // Central Canterbury
                zoom: 9, // Central Canterbury
                maxBounds: [[-33, 165], [-48, 179]], // New Zealand
                zoomControl: true,
                editable: true, // to enable leaflet.editable
                drawingCursor: 'crosshair',
                trackResize: false // we handle the resizing to the ResizableBox
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
    
            this.resizeMap(this.initialHeight, this.initialWidth);
    
            this.showSelectedMaps();
            this.setRoutesFromJson(this.pendingRoutesAsJson);

            this.fitBounds();

            this.mapInitialized = true;
        }
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

    // -------------------------------------------------------
    // Selected Maps
    // -------------------------------------------------------

    private unshowSelectedMaps(): void {
        this.mapSheets.forEach((mapSheet: string) => {
            this.unhighlightMapSheet(mapSheet);
        });
    }

    private showSelectedMaps(): void {
        this.mapSheets.forEach((selectedMapSheet: string) => {
            this.highlightMapSheet(selectedMapSheet);
        });
    }

    private highlightMapSheet(mapSheet: string): void {
        const polygon: NZ50MapPolygon = this.nz50MapPolygonsBySheet[mapSheet];
        if (polygon) {
            polygon.setStyle({ fillOpacity: 0.1});
        }
    }

    private unhighlightMapSheet(mapSheet: string): void {
        const polygon: NZ50MapPolygon = this.nz50MapPolygonsBySheet[mapSheet];
        if (polygon) {
            polygon.setStyle({ fillOpacity: 0.0});
        }
    }
}