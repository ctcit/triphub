import * as L from 'leaflet';
import 'src/leaflet-editable/leaflet-editable.js';
import 'leaflet-gpx';
import * as React from 'react';
import { Component } from 'react';
import FormGroup from 'reactstrap/lib/FormGroup';
import Col from 'reactstrap/lib/Col';
import { Button, TabPane, TabContent, Nav, NavItem, NavLink, Tooltip, CustomInput, ButtonGroup, Row, FormText } from 'reactstrap';
import { IMap } from './Interfaces';
import { Tag, WithContext as ReactTags } from 'react-tag-input';
import { MdAddCircle, MdClear, MdUndo, MdTimeline, MdGridOff} from 'react-icons/md';
import classnames from 'classnames';
import { ResizableBox, ResizeCallbackData } from 'react-resizable';
import * as Popper from 'popper.js';
import ReactResizeDetector from 'react-resize-detector';

type NZ50MapPolygon = L.Polygon & {nz50map: { sheetCode: string }};

const KeyCodes = {
    comma: 188,
    enter: 13,
  };
   
const delimiters = [KeyCodes.comma, KeyCodes.enter];

export class MapEditor extends Component<{
    nz50MapsBySheet: { [mapSheet: string] : IMap },
    mapSheets: string[],
    routesAsJson: string,
    onMapSheetsChanged: (mapSheets: string[]) => void,
    onRoutesChanged: (routesAsJson: string) => void
},{
    activeTab: string,
    mapSheets: string[]
    routes: L.Polyline[],
    canUndoLastRouteEdit: boolean,
    gpxFile?: File,
    invalidGpxFile: boolean,
    tags: Tag[],
    suggestions: Tag[],
    maxMapWidth: number
}>{
    // the leaflet map
    private map: L.Map;

    // NZ50 map sheets grid
    private nz50LayerGroup: L.LayerGroup<NZ50MapPolygon[]>;
    private nz50MarkerLayerGroup: L.LayerGroup<L.Marker[]>;
    private nz50MapPolygonsBySheet: { [mapSheet: string] : NZ50MapPolygon } = {};

    // selected map sheets
    private mapSheets: string[] = this.props.mapSheets || [];

    // routes
    private routes: L.Polyline[] = [];
    private routesUndoStack: string[] = [];
    private vertexIsDragging: boolean = false;
    private routeColours: string[] = ['red', 'magenta', 'cyan', 'yellow'];


    constructor(props:any) {
        super(props);

        this.state = { 
            activeTab: "SelectMaps",

            mapSheets: this.mapSheets,
            routes: this.routes,
            canUndoLastRouteEdit: false,
            gpxFile: undefined,
            invalidGpxFile: false,

            tags: [],
            suggestions: Object.keys(this.props.nz50MapsBySheet).map((mapSheet: string) => {
                const nz50Map: IMap = this.props.nz50MapsBySheet[mapSheet];
                return { id: nz50Map.sheetCode, text: nz50Map.sheetCode + ' ' + nz50Map.name };
            }),

            maxMapWidth: 1200
        };
    }

    public componentDidMount() {

        this.map = L.map('map', {
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
        }).addTo(this.map);
        

        this.nz50LayerGroup = L.layerGroup()
            .addTo(this.map);
        this.nz50MarkerLayerGroup = L.layerGroup()
            .addTo(this.map);

        Object.keys(this.props.nz50MapsBySheet).map((mapSheet: string) => {
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

            // add click event handler for polygon
            (polygon as any).nz50map = nz50Map;
            polygon.on('click', event => {
                this.selectOrUnselectMap(event.target);
            });

            this.nz50MapPolygonsBySheet[nz50Map.sheetCode] = polygon as NZ50MapPolygon;
        });

        this.map.on('zoomend', () => {
            if (this.map.getZoom() < 9) {
                if (this.map.hasLayer(this.nz50MarkerLayerGroup)) {
                    this.map.removeLayer(this.nz50MarkerLayerGroup);
                }
            } else {
                if (!this.map.hasLayer(this.nz50MarkerLayerGroup)) {
                    this.map.addLayer(this.nz50MarkerLayerGroup);
                }
            }
        });

        this.resizeMap(500, 500);

        this.setRoutesFromJson(this.props.routesAsJson);
        this.setState({ routes: this.routes });
        this.saveRoute(); 

        this.showInitiallySelectedMaps();
        this.fitBounds();
    }

    public render(){
        const onResizeModal = (width: number, height: number) => {
            // event fired by ReactResizeDetector
            // limit the resizable maximum width for the map when the modal width changes
            this.setState({maxMapWidth: width});
            // resize the ResizableBox containing the map
            const layerControl: HTMLStyleElement = document.getElementsByClassName('resizableMap')[0] as HTMLStyleElement;
            layerControl.style.width = Math.floor(width).toString() + 'px';
            // resize the map
            this.resizeMap(undefined, width);
        }

        const onResizeMap = (e: React.SyntheticEvent, data: ResizeCallbackData) => {
            this.resizeMap(data.size.height, data.size.width);
        }
        
        const setSelectMapsTab = () => {
            this.endRoute();
            setTab('SelectMaps');
        }
        const setEditRoutesTab = () => {
            this.continueRoute();
            setTab('EditRoute');
        }
        const setTab = (tab: string) => {
            if (this.state.activeTab !== tab) {
                this.setState({ activeTab: tab });
            }
        }

        const handleDelete = (pos: number) => this.deleteSelectedMaps(pos);
        const handleAddition = (tag: Tag) => this.addSelectedMaps([tag.id]);
        const handleDrag = (tag: Tag, currPos: number, newPos: number) => this.dragSelectedMaps(tag, currPos, newPos);

        const selectRouteMaps = () => this.selectRouteMaps();
        const clearSelectedMaps = () => this.clearSelectedMaps();

        const addRoute = () => {
            this.addRoute();
            this.saveRoute();
        }
        const clearRoute = () => {
            this.clearRoute();
            this.saveRoute();
            this.continueRoute();
        }
        const generalizeRoute = () => {
            this.generalizeRoute();
            this.saveRoute();
            this.continueRoute();
        }
        const undoLastRouteEdit = () => {
            this.undoLastRouteEdit();
            this.continueRoute();
        }
        const importGpx = (e: any) => {
            const gpxFile = e.target.files ? e.target.files[0] : null;
            e.target.value = null; // allow selecting the same file again
            this.setState( {gpxFile});
            this.importGpx(gpxFile).then(() => {
                this.saveRoute();
                this.continueRoute();
            })
        }

        return (
            <FormGroup>
                <ReactResizeDetector handleWidth={true} handleHeight={false} onResize={onResizeModal} />
                <Nav tabs={true}>
                    <NavItem>
                    <NavLink
                        className={classnames({ active: this.state.activeTab === 'SelectMaps' })}
                        onClick={setSelectMapsTab}
                    >
                        Select Map Sheets
                    </NavLink>
                    </NavItem>
                    <NavItem>
                    <NavLink
                        className={classnames({ active: this.state.activeTab === 'EditRoutes' })}
                        onClick={setEditRoutesTab}
                    >
                        Edit Routes
                    </NavLink>
                    </NavItem>
                </Nav>
                <TabContent activeTab={this.state.activeTab}>
                    <TabPane tabId="SelectMaps">
                        <Row className="mb-2 ml-1"><FormText color='muted'>Click on map sheet to select; click again to unselect</FormText></Row>
                        <Row className="mb-2">
                            <Col sm={2}>
                                <ButtonGroup>
                                    <ButtonWithTooltip id="SelectMapsOverlappingRouteButton" color='primary' 
                                        onClick={selectRouteMaps} disabled={this.state.routes.length === 0 }  
                                        placement="top" tooltipText="Select maps overlapping the route">
                                            <MdGridOff/>
                                    </ButtonWithTooltip>
                                    <ButtonWithTooltip id="ClearSelectedMapsButton" color='primary' 
                                        onClick={clearSelectedMaps} disabled={false} 
                                        placement="top" tooltipText="Clear all selected maps">
                                            <MdClear/>
                                    </ButtonWithTooltip>
                                </ButtonGroup>
                            </Col>
                            <Col sm={6}>
                                <ReactTags tags={this.state.tags}
                                    suggestions={this.state.suggestions}
                                    handleDelete={handleDelete}
                                    handleAddition={handleAddition}
                                    handleDrag={handleDrag}
                                    delimiters={delimiters}
                                    placeholder={'Start typing to add a map sheet by name'} />
                            </Col>
                        </Row>
                    </TabPane>
                    <TabPane tabId="EditRoute">
                        <Row className="mb-2 ml-1"><FormText color='muted'>Click points on map to draw route, or import route from GPX file</FormText></Row>
                        <Row className="mb-2">
                            <Col sm={4}>
                                <ButtonGroup>
                                    <ButtonWithTooltip id="AddRouteButton" color='primary' 
                                        onClick={addRoute} disabled={false} 
                                        placement="top" tooltipText="Add new route">
                                        <MdAddCircle/>
                                    </ButtonWithTooltip>
                                    <ButtonWithTooltip id="ClearAllRoutesButton" color='primary' 
                                        onClick={clearRoute} disabled={this.state.routes.length === 0}  
                                        placement="top" tooltipText="Clear all routes">
                                            <MdClear/>
                                    </ButtonWithTooltip>
                                    <ButtonWithTooltip id="SimplifyRouteButton" color='primary' 
                                        onClick={generalizeRoute} disabled={this.state.routes.length === 0} 
                                        placement="top" tooltipText="Simplify route for current zoom level">
                                            <MdTimeline/>
                                    </ButtonWithTooltip>
                                    <ButtonWithTooltip id="UndoButton" color='primary' 
                                        onClick={undoLastRouteEdit} disabled={!this.state.canUndoLastRouteEdit} 
                                        placement="top" tooltipText="Undo last change">
                                            <MdUndo/>
                                    </ButtonWithTooltip>
                                </ButtonGroup>
                            </Col>
                            <Col sm={6}>
                                <CustomInput
                                    type="file" id="GpxFileInput" name="customFile"
                                    label={this.state.gpxFile ? this.state.gpxFile.name : 'Import from GPX'}
                                    onChange={importGpx}
                                    invalid={this.state.invalidGpxFile} 
                                />
                            </Col>
                        </Row>
                </TabPane>
                </TabContent>
                <ResizableBox key="resizableMap" className="resizableMap" width={this.state.maxMapWidth} height={500} axis={'y'} minConstraints={[300, 300]} maxConstraints={[this.state.maxMapWidth, 2000]} onResize={onResizeMap}>
                    <div id="map"/>
                </ResizableBox>
            </FormGroup>
        );
    }

    private mapSheetWithName(mapSheet: string) {
        const nz50Map: IMap = this.props.nz50MapsBySheet[mapSheet];
        return nz50Map ? nz50Map.sheetCode + ' ' + nz50Map.name : mapSheet;
    }

    private resizeMap(height?: number, width?: number): void {
        const layerControl: HTMLStyleElement = document.getElementById('map') as HTMLStyleElement;
        if (height) {
            layerControl.style.height = Math.floor(height - 8).toString() + 'px';
        }
        if (width) {
            layerControl.style.width = Math.floor(width - 8).toString() + 'px';
        }
        this.map.invalidateSize();
    }

    // -------------------------------------------------------
    // Route editing
    // -------------------------------------------------------

    private continueRoute() {
        if (this.routes.length > 0) {
            this.routes.forEach((route: L.Polyline) => {
                route.enableEdit();
                this.setRouteEventsOn(route);
            });
            const lastRoute = this.routes[this.routes.length - 1];
            ((lastRoute as any).editor as L.PolylineEditor).continueForward();
        } else {
            this.addRoute();
        }
    }

    private addRoute(): void {
        if (this.routes.length > 0 && this.routes[this.routes.length - 1].getLatLngs().length === 0) {
            return; // use existing empty route
        }
        const route = this.map.editTools.startPolyline(undefined, {
            color: this.getRouteColor()
        });
        this.setRouteEventsOn(route);
        this.routes.push(route);
        this.setState({ routes: this.routes });
    }

    private endRoute(): void {
        this.routes = this.routes.filter((route: L.Polyline) => {
            this.setRouteEventsOff(route);
            route.disableEdit();
            if (route.getLatLngs().length === 0) {
                route.remove(); // purge empty routes
                return false;
            }
            return true;
        });
        this.setState({ routes: this.routes });
    }

    private clearRoute(): void {
        this.routes.forEach((route: L.Polyline) => {
            this.setRouteEventsOff(route);
            route.disableEdit();
            route.remove();
        });
        this.routes = [];
        this.setState({ routes: this.routes });
    }

    private setRouteEventsOn(route: L.Polyline) {
        route.on('editable:editing', () => {
            if (!this.vertexIsDragging) {
                this.saveRoute();
            }
        });
        route.on('editable:vertex:dragstart', () => { 
            this.vertexIsDragging = true; 
        });
        route.on('editable:vertex:dragend', () => { 
            this.vertexIsDragging = false; 
            this.saveRoute();
        });
    }

    private setRouteEventsOff(route: L.Polyline) {
        route.off('editable:vertex:dragstart');
        route.off('editable:vertex:dragend');
        route.off('editable:editing');
    }

    private importGpx(gpxFile: File): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!gpxFile) {
                reject();
            }
            this.clearRoute();
            const reader = new FileReader();
    
            let gpxLatLngs: L.LatLng[] = [];
            reader.onload = () => {
                const gpx = reader.result as string;
                new L.GPX(gpx, {
                    async: true, 
                    polyline_options: {
                        color: this.getRouteColor()
                    }
                }).on('addline', (event: any) => {
                    gpxLatLngs = gpxLatLngs.concat((event.line as L.Polyline).getLatLngs() as L.LatLng[]);
                }).on('loaded', (event: Event) => {
                    const generalizedLatLngs = this.generalize(gpxLatLngs);
                    if (generalizedLatLngs.length > 0) {
                        const route = L.polyline(generalizedLatLngs, {color: this.getRouteColor()}).addTo(this.map);
                        this.routes.push(route);
                        this.saveRoute();
                        this.setState({ routes: this.routes });
                    }
                    this.fitBounds();
                    this.setState({invalidGpxFile: false });
                    resolve();
                }).on('error', (event: any) => {
                    this.setState({invalidGpxFile: true })
                    alert('Error loading file: ' + event.err);
                    reject();
                });
            };
    
            reader.readAsText(gpxFile);
        });
    }

    private generalizeRoute(): void {
        const zoom = this.map.getZoom();
        const tolerance = 22 + 240000 * Math.exp(-0.6 * zoom);
        const generalizedLatLngsPerRoute: L.LatLng[][] = this.routes.map((route: L.Polyline) => this.generalize(route.getLatLngs() as L.LatLng[], tolerance));
        this.clearRoute();
        generalizedLatLngsPerRoute.forEach((generalizedLatLngs: L.LatLng[]) => {
            if (generalizedLatLngs.length > 0) {
                const route = L.polyline(generalizedLatLngs, {color: this.getRouteColor()}).addTo(this.map);
                this.routes.push(route);
            }
        });
        this.setState({ routes: this.routes });
    }

    private generalize(latLngs: L.LatLng[], tolerance: number = 25): L.LatLng[] {
        const generalizedLatLngs: L.LatLng[] = [];
        let lastLatLng: L.LatLng | null = null;
        latLngs.forEach((latLng: L.LatLng) => {
            if (lastLatLng === null) {
                generalizedLatLngs.push(latLng);
                lastLatLng = latLng;
            } else {
                if (this.map.distance(latLng, lastLatLng) >= tolerance) {
                    generalizedLatLngs.push(latLng);
                    lastLatLng = latLng;
                }
            }
        });
        return generalizedLatLngs;
    }

    private saveRoute(): void {
        const routesAsJSON: string = this.getRoutesAsJson();
        this.props.onRoutesChanged(routesAsJSON);
        this.routesUndoStack.push(routesAsJSON);
        console.log(">>>>> " + this.routesUndoStack.length + ", " + routesAsJSON);
        this.setState({ canUndoLastRouteEdit: this.routesUndoStack.length > 1 });
    }

    private undoLastRouteEdit(): void {
        if (this.routesUndoStack.length > 1) { // always leave the orignal on the stack
            let routesAsJSON = this.routesUndoStack.pop(); // discard this
            routesAsJSON = this.routesUndoStack[this.routesUndoStack.length - 1];
            console.log("<<<< " + this.routesUndoStack.length + ", " + routesAsJSON);
            this.setRoutesFromJson(routesAsJSON);
        }
        this.setState({ canUndoLastRouteEdit: this.routesUndoStack.length > 1 });
    }

    private getRoutesAsJson(): string {
        return JSON.stringify(this.routes.map((route: L.Polyline) => {
            return (route.getLatLngs() as L.LatLng[]).map((latLng: L.LatLng) => {
                return [latLng.lat, latLng.lng]
            });
        }));
    }

    private setRoutesFromJson(routesAsJson: string): void {
        this.clearRoute();
        if (routesAsJson) {
            const routesLatLngs: L.LatLng[][] = JSON.parse(routesAsJson);
            routesLatLngs.forEach(routeLatLngs => {
                this.routes.push(L.polyline(routeLatLngs, {color: this.getRouteColor()}).addTo(this.map));
            });
        }
    }

    private getRouteColor() {
        return this.routeColours[this.routes.length % this.routeColours.length];
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
            this.map.fitBounds(bounds);
        }
    }

    // -------------------------------------------------------
    // Map selection
    // -------------------------------------------------------

    private showInitiallySelectedMaps(): void {
        const initialMapSheets = this.mapSheets;
        this.clearAllSelectedMaps();
        this.addSelectedMaps(initialMapSheets);
    }

    private clearSelectedMaps(): void {
        this.clearAllSelectedMaps();
    }

    private selectRouteMaps(): void {
        this.clearAllSelectedMaps();
        const mapPolygons = (this.nz50LayerGroup.getLayers() as NZ50MapPolygon[]).filter((polygon) => {
            return polygon.nz50map;
        });
        const mapSheets: string[] = [];
        // crude, but good enough, overlap detection
        mapPolygons.forEach((polygon: NZ50MapPolygon) => {
            const mapSheet: string = polygon.nz50map.sheetCode;
            const polygonBounds = polygon.getBounds();
            const intersects = this.routes.some((route: L.Polyline) => {
                return (route.getLatLngs() as L.LatLng[]).some((latLng: L.LatLng) => {
                    return polygonBounds.contains(latLng);
                });
            });
            if (intersects) {
                mapSheets.push(mapSheet);
            }
        });
        this.addSelectedMaps(mapSheets);
    }

    private selectOrUnselectMap(polygon: NZ50MapPolygon): void {
        const mapSheet: string = polygon.nz50map.sheetCode;
        const index = this.mapSheets.indexOf(mapSheet);
        if (index < 0) {
            this.addSelectedMaps([ mapSheet ]);
        } else {
            this.deleteSelectedMaps(index);
        }
    }

    private clearAllSelectedMaps(): void {
        this.mapSheets.forEach((mapSheet: string) => {
            this.unhighlightMapSheet(mapSheet);
        });
        this.mapSheets = [];
        this.setTags();
        this.saveSelectedMaps();
    }

    private addSelectedMaps(addedMapSheets: string[]): void {
        addedMapSheets.forEach((addedMapSheet: string) => {
            this.highlightMapSheet(addedMapSheet);
        });
        this.mapSheets = this.mapSheets.concat(addedMapSheets);
        this.setTags();
        this.saveSelectedMaps();
    }

    private deleteSelectedMaps(pos: number): void {
        const tag: Tag = this.state.tags[pos];
        if (tag) {
            this.unhighlightMapSheet(tag.id);
            this.mapSheets = this.mapSheets.filter((mapSheet: string) => mapSheet !== tag.id);
            this.setTags();
            this.saveSelectedMaps();
        }
    }
 
    private dragSelectedMaps(tag: Tag, currPos: number, newPos: number): void {
        const tags = [...this.state.tags];
        const newTags = tags.slice();
        newTags.splice(currPos, 1);
        newTags.splice(newPos, 0, tag);
        this.mapSheets = newTags.map(newTag => newTag.id);
        this.setTags();
        this.saveSelectedMaps();
}

    private setTags(): void {
        const newTags = this.mapSheets.map((mapSheet: string) => ({ id: mapSheet, text: this.mapSheetWithName(mapSheet) }));
        this.setState({ tags: newTags, mapSheets: this.mapSheets });
    }

    private saveSelectedMaps(): void {
        this.props.onMapSheetsChanged(this.mapSheets);
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

    // private loadSelectedMaps(): void {
    //     const lastSelectedMaps = sessionStorage.getItem('lastSelectedMaps');
    //     if (lastSelectedMaps) {
    //         const values = (lastSelectedMaps || "").split(" ");
    //         this.getMapPolygons().forEach((polygon: NZ50MapPolygon) => {
    //             if (values.indexOf(polygon.nz50map.sheetCode) >= 0) {
    //                 this.toggleSelectMap(polygon);
    //             }
    //         });
    //     }
    // }

    // private saveSelectedMaps(): void {
    //     const selectedMapsInput: HTMLInputElement = document.getElementById('selected-maps') as HTMLInputElement;
    //     sessionStorage.setItem('lastSelectedMaps', selectedMapsInput.value);
    // }


}

// -------------------------------------------------------
// -------------------------------------------------------

export class ButtonWithTooltip extends Component<{
    id: string,
    color: string,
    disabled: boolean,
    onClick: () => void,
    tooltipText: string,
    placement: Popper.Placement
},{
    tooltipOpen: boolean ,
}>{
    constructor(props:any) {
        super(props);

        this.state = { 
            tooltipOpen: false
        };
    }

    public render(){
        const toggle = () => { this.setState( { tooltipOpen: !this.state.tooltipOpen }) };

        return <div>
            <Button id={this.props.id} color={this.props.color} disabled={this.props.disabled} onClick={this.props.onClick} >{this.props.children}</Button>
            <Tooltip target={this.props.id} isOpen={this.state.tooltipOpen} placement={this.props.placement} toggle={toggle}>{this.props.tooltipText}</Tooltip>
        </div>
    }
}