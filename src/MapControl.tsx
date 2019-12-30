import * as L from 'leaflet';
import * as React from 'react';
import { Component } from 'react';
import { App } from './App';
import { Modal, ModalHeader, ModalBody, ModalFooter, ListGroup, ListGroupItem, Col, Row,  } from 'reactstrap';
import { MapEditor } from './MapEditor';
import FormGroup from 'reactstrap/lib/FormGroup';
import Button from 'reactstrap/lib/Button';
import { IMap } from './Interfaces';
import { ResizableBox, ResizeCallbackData } from 'react-resizable';
import Label from 'reactstrap/lib/Label';

type NZ50MapPolygon = L.Polygon & {nz50map: { sheetCode: string }};

export class MapControl extends Component<{
    app: App,
    readOnly: boolean
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
    private nz50maps: IMap[];
    private nz50LayerGroup: L.LayerGroup<NZ50MapPolygon[]>;
    private nz50MapPolygonsBySheet: { [mapSheet: string] : NZ50MapPolygon } = {};

    // selected map sheets
    private mapSheets: string[] = /* this.props.mapSheets || */ [];
    private tempMapSheets: string[] = []; // changed mapSheets before being saved

    // routes
    private routes: L.Polyline[] = [];
    private tempRoutesAsJson: string;  // changed routes before being saved
    private routeColours: string[] = ['red', 'magenta', 'cyan', 'yellow'];


    constructor(props:any) {
        super(props);

        this.state = { 
            mapVisible: false,
            editing: false,
            editsMade: false
        };
        
        this.nz50maps = this.props.app.getMaps();

        this.tempRoutesAsJson = this.getRoutesAsJson();
        this.tempMapSheets = this.mapSheets;
    }

    public componentDidMount() {
        if (this.mapVisible()) {
            this.setUpMap();
        }
    }

    public render(){
        const onEdit = () => { 
            this.setState({ editing: true }); 
        }

        const onMapSheetsChanged = (mapSheets: string[]) => {
            this.tempMapSheets = mapSheets;
            this.setState({ editsMade: true });
        }
        const onRoutesChanged = (routesAsJson: string) => {
            this.tempRoutesAsJson = routesAsJson;
            this.setState({ editsMade: true });
        }

        const onSave = () => { 
            const mapVisible: boolean = this.tempMapSheets.length > 0 || Boolean(this.tempRoutesAsJson);
            this.setState({ 
                mapVisible
            }, () => {
                if (mapVisible) {
                    this.setUpMap();
                }
                this.mapSheets = this.tempMapSheets;
                this.showSelectedMaps();
    
                this.setRoutesFromJson(this.tempRoutesAsJson);
    
                this.setState({ 
                    editing: false,
                }); 
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
                    <Col sm={4}>
                    {
                        this.mapSheets.length > 0 &&
                            <ListGroup>
                                { this.mapSheets.map((mapSheet: string) => 
                                    <ListGroupItem sm={4} key={mapSheet} color="primary">{this.mapSheetWithName(mapSheet)}</ListGroupItem>
                                )}
                            </ListGroup>
                    }
                    {
                        this.mapSheets.length === 0 &&
                            <Label>No maps selected</Label>
                    }
                    </Col>
                    <Col sm={'auto'}>
                    { this.state.mapVisible &&
                        <ResizableBox width={this.initialWidth} height={this.initialHeight} minConstraints={[200, 200]} onResize={onResize}>
                            <div id="minimap"/>
                        </ResizableBox>
                    }
                    { !this.state.mapVisible &&
                            <Label>No route specified</Label>
                    }
                    </Col>
                    <Col sm={2}>
                        <FormGroup row={true} key='mapeditor'>
                            <Button onClick={onEdit} hidden={this.props.readOnly}>Edit</Button>
                            <Modal isOpen={this.state.editing} toggle={onSave} size="lg" style={{maxWidth: '1600px', width: '80%', margin: '10px auto'}}>
                                <ModalHeader toggle={onSave}>Maps and Route</ModalHeader>
                                <ModalBody>
                                    <MapEditor app={this.props.app} nz50maps={this.nz50maps} mapSheets={this.mapSheets} routesAsJson={this.getRoutesAsJson()}
                                        onMapSheetsChanged={onMapSheetsChanged} onRoutesChanged={onRoutesChanged}/>
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

            // {this.props.app.getMaps()
            //     .map((m: IMap) => <option key={'map' + m.sheetCode} value={m.sheetCode + ' ' + m.name} />)}

            this.nz50maps.forEach(nz50map => {
                // the map sheet polygon
                const polygon = L.polygon(nz50map.coords, {color: 'blue', weight: 2, fill: true, fillOpacity: 0.0}).addTo(this.nz50LayerGroup);

                // the map sheet label
                const polygonLabel = L.divIcon({className: 'sheet-div-icon',
                    html: '<div class="sheet-code">' + nz50map.sheetCode + '</div><div class="sheet-name">' + nz50map.name + '</div>'});
                // you can set .my-div-icon styles in CSS

                // ideally would centre around polygon.getCenter()...
                const markerPos = polygon.getBounds().pad(-0.25).getNorthWest();

                L.marker(markerPos, {icon: polygonLabel, interactive: false}).addTo(this.nz50LayerGroup);

                this.nz50MapPolygonsBySheet[nz50map.sheetCode] = polygon as NZ50MapPolygon;
            });

            this.resizeMap(this.initialHeight, this.initialWidth);
    
            this.showSelectedMaps();
            this.setRoutesFromJson(this.tempRoutesAsJson);

            this.mapInitialized = true;
        }
    }
    
    private mapVisible(): boolean {
        return this.mapSheets.length > 0 || this.routes.length > 0;
    }

    private mapSheetWithName(mapSheet: string) {
        const nz50map = this.nz50maps.find((nz50map2 => nz50map2.sheetCode === mapSheet));
        return nz50map ? nz50map.sheetCode + ' ' + nz50map.name : mapSheet;
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
                this.routes.push(L.polyline(routeLatLngs, {color: this.getRouteColor()}).addTo(this.minimap));
            });
        }
    }

    private getRouteColor() {
        return this.routeColours[this.routes.length % this.routeColours.length];
    }

    // -------------------------------------------------------
    // Selected Maps
    // -------------------------------------------------------

    private showSelectedMaps(): void {
        const selectedMapSheets = this.mapSheets;
        this.mapSheets.forEach((mapSheet: string) => {
            this.unhighlightMapSheet(mapSheet);
        });
        this.mapSheets = [];
        selectedMapSheets.forEach((selectedMapSheet: string) => {
            this.highlightMapSheet(selectedMapSheet);
        });
        this.mapSheets = this.mapSheets.concat(selectedMapSheets);
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