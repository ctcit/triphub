import * as L from 'leaflet';
import 'src/leaflet-editable/leaflet-editable.js';
import 'leaflet-gpx';
import * as React from 'react';
import { Component } from 'react';
import FormGroup from 'reactstrap/lib/FormGroup';
import Col from 'reactstrap/lib/Col';
import { Button, TabPane, TabContent, Nav, NavItem, NavLink, Tooltip, CustomInput, ButtonGroup, Row, FormText } from 'reactstrap';
import { IMap, IArchivedRoute } from './Interfaces';
import { Tag, WithContext as ReactTags } from 'react-tag-input';
import { MdAddCircle, MdClear, MdUndo, MdTimeline, MdGridOff, MdNavigateNext, MdNavigateBefore, MdClearAll, MdContentCut, MdZoomOutMap} from 'react-icons/md';
import { GiJoint } from 'react-icons/gi';
import { IoMdSwap } from 'react-icons/io';
import { AiOutlineRollback } from 'react-icons/ai';
import classnames from 'classnames';
import { ResizableBox, ResizeCallbackData } from 'react-resizable';
import * as Popper from 'popper.js';
import ReactResizeDetector from 'react-resize-detector';
import { Spinner } from 'src';

type NZ50MapPolygon = L.Polygon & {nz50map: { sheetCode: string }};
type ArchivedRoutePolygon = L.Polygon & {archivedRoute: { id: string }};


const KeyCodes = {
    comma: 188,
    enter: 13,
  };
   
const delimiters = [KeyCodes.comma, KeyCodes.enter];

export class MapEditor extends Component<{
    nz50MapsBySheet: { [mapSheet: string] : IMap },
    archivedRoutesById: { [archivedRouteId: string] : IArchivedRoute },
    mapSheets: string[],
    routesAsJson: string,
    onMapSheetsChanged: (mapSheets: string[]) => void,
    onRoutesChanged: (routesAsJson: string) => void,
    getArchivedRoute: (routeId: string) => Promise<IArchivedRoute | undefined>, // TODO - replace with service
    updateArchivedRouteSummary: (routeId: string, routeSummary: string) => Promise<void>
},{
    activeTab: string,
    mapSheets: string[]
    currentRouteIndex: number,
    routes: L.Polyline[],
    canUndoLastRouteEdit: boolean,
    splitMode: boolean,
    gpxFile?: File,
    invalidGpxFile: boolean,
    tags: Tag[],
    mapSheetSuggestions: Tag[],
    archivedRouteSuggestions: Tag[],
    maxMapWidth: number,
    busy: boolean
}>{
    // the leaflet map
    private map: L.Map;

    private infoControl: L.Control;;

    // NZ50 map sheets grid
    private nz50LayerGroup: L.LayerGroup<NZ50MapPolygon[]>;
    private nz50MarkerLayerGroup: L.LayerGroup<L.Marker[]>;
    private nz50MapPolygonsBySheet: { [mapSheet: string] : NZ50MapPolygon } = {};

    // Archived routes
    private archivedRoutesLayerGroup: L.LayerGroup<ArchivedRoutePolygon[]>;

    // selected map sheets
    private mapSheets: string[] = this.props.mapSheets || [];

    // routes
    private currentRouteIndex: number = -1;
    private routes: L.Polyline[] = [];
    private routeMarkers: L.Marker[] = [];
    private routesUndoStack: Array<{ routesAsJSON: string, currentRouteIndex: number }> = [];
    private vertexIsDragging: boolean = false;
    private routeColours: string[] = ['red', 'magenta', 'cyan', 'yellow', 'deeppink', 'darkviolet', 'teal', 'orangered'];


    constructor(props:any) {
        super(props);

        this.state = { 
            activeTab: "SelectMaps",

            mapSheets: this.mapSheets,
            currentRouteIndex: this.routes.length - 1,
            routes: this.routes,
            canUndoLastRouteEdit: false,
            splitMode: false,
            gpxFile: undefined,
            invalidGpxFile: false,

            tags: [],
            mapSheetSuggestions: Object.keys(this.props.nz50MapsBySheet).map((mapSheet: string) => {
                const nz50Map: IMap = this.props.nz50MapsBySheet[mapSheet];
                return { id: nz50Map.sheetCode, text: nz50Map.sheetCode + ' ' + nz50Map.name };
            }),

            archivedRouteSuggestions: Object.keys(this.props.archivedRoutesById).map((archivedRouteId: string) => {
                const archivedRoute: IArchivedRoute = this.props.archivedRoutesById[archivedRouteId];
                return { id: archivedRoute.id.toString(), text: archivedRoute.caption };
            }),

            maxMapWidth: 1200,

            busy: false
        };
    }

    public componentDidMount() {
        this.setUpMap();
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
            this.highlightSelectedMaps();
            this.endRoute();
            this.hideArchivedRoutes();
            setTab('SelectMaps');
        }
        const setEditRoutesTab = () => {
            this.unhighlightSelectedMaps();
            this.hideArchivedRoutes();
            this.continueRoute();
            setTab('EditRoutes');
        }
        const setRoutesArchiveTab = () => {
            this.unhighlightSelectedMaps();
            this.endRoute();
            this.showArchivedRoutes();
            setTab('RoutesArchive');
        }
        const setTab = (tab: string) => {
            if (this.state.activeTab !== tab) {
                this.setState({ activeTab: tab });
            }
        }

        const handleMapDelete = (pos: number) => this.deleteSelectedMaps(pos);
        const handleMapAddition = (tag: Tag) => this.addSelectedMaps([tag.id]);
        const handleMapDrag = (tag: Tag, currPos: number, newPos: number) => this.dragSelectedMaps(tag, currPos, newPos);

        const selectRouteMaps = () => this.selectRouteMaps();
        const clearSelectedMaps = () => this.clearSelectedMaps();

        const addRoute = () => {
            this.endRoute();
            this.addRoute();
            this.saveRouteChange();
            this.continueRoute();
        }
        const deleteRoute = () => {
            this.deleteRoute();
            this.saveRouteChange();
            this.continueRoute();
        }
        const clearAllRoutes = () => {
            this.clearAllRoutes();
            this.saveRouteChange();
            this.continueRoute();
        }
        const previousRoute = () => {
            this.endRoute();
            this.previousRoute();
            this.saveRouteChange();
            this.continueRoute();
        }
        const nextRoute = () => {
            this.endRoute();
            this.nextRoute();
            this.saveRouteChange();
            this.continueRoute();
        }
        const zoomToRoutes = () => {
            this.fitBounds();
        }
        const joinRoute = () => {
            this.endRoute();
            this.joinNextRoute();
            this.saveRouteChange();
            this.continueRoute();
        }
        const splitRoute = () => {
            this.setState( { splitMode: !this.state.splitMode })
        }
        const swapRoute = () => {
            this.endRoute();
            this.swapNextRoute();
            this.saveRouteChange();
            this.continueRoute();
        }
        const reverseRoute = () => {
            this.endRoute();
            this.reverseRoute();
            this.saveRouteChange();
            this.continueRoute();
        }
        const generalizeRoute = () => {
            this.generalizeRoute().then(() => {
                this.endRoute();
                this.saveRouteChange();
                this.continueRoute();
            });
        }
        const undoLastRouteEdit = () => {
            this.endRoute();
            this.undoLastRouteEdit().then(() => {
                this.continueRoute();
            }, () => {
                this.continueRoute();
            });
        }
        const undoLastRouteEditWithoutContinue = () => {
            this.endRoute();
            this.undoLastRouteEdit();
        }
        // const updateArchivedRouteSummary = () => {
        //     this.updateArchivedRouteSummary();
        // }
        const importGpx = (e: any) => {
            const gpxFile = e.target.files ? e.target.files[0] : null;
            e.target.value = null; // allow selecting the same file again
            this.setState( {gpxFile});
            this.endRoute();
            this.importGpxFromFile(gpxFile).then(() => {
                this.saveRouteChange();
                this.continueRoute();
            }, () => {
                this.continueRoute();
            })
        }
        const handleArchivedRouteDelete = (pos: number) => null;
        const handleArchivedRouteAddition = (tag: Tag) => {
            this.selectArchivedRoute(tag.id);
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
                    <NavItem>
                    <NavLink
                        className={classnames({ active: this.state.activeTab === 'RoutesArchive' })}
                        onClick={setRoutesArchiveTab}
                    >
                        Routes Archive
                    </NavLink>
                    </NavItem>
                </Nav>
                <TabContent activeTab={this.state.activeTab}>
                    <TabPane tabId="SelectMaps">
                        <Row className="mb-2 ml-1"><FormText color='muted'>Click on map sheet to select; click again to unselect</FormText></Row>
                        <Row className="mb-2">
                            <Col sm={2}>
                                <ButtonGroup>
                                    <ButtonWithTooltip id="ZoomToRoutesButton1" color='primary' 
                                        onClick={zoomToRoutes} disabled={this.state.routes.length === 0} 
                                        placement="top" tooltipText="Zoom to route extents">
                                            <MdZoomOutMap/>
                                    </ButtonWithTooltip>
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
                                    suggestions={this.state.mapSheetSuggestions}
                                    handleDelete={handleMapDelete}
                                    handleAddition={handleMapAddition}
                                    handleDrag={handleMapDrag}
                                    delimiters={delimiters}
                                    placeholder={'Start typing to add a map sheet by name'} />
                            </Col>
                        </Row>
                    </TabPane>
                    <TabPane tabId="EditRoutes">
                        <Row className="mb-2 ml-1"><FormText color='muted'>Click points on map to draw route, or import route from GPX file</FormText></Row>
                        <Row className="mb-2">
                            <Col sm={5}>
                                <ButtonGroup>
                                    <ButtonWithTooltip id="ZoomToRoutesButton2" color='primary' 
                                        onClick={zoomToRoutes} disabled={this.state.routes.length === 0} 
                                        placement="top" tooltipText="Zoom to route extents">
                                            <MdZoomOutMap/>
                                    </ButtonWithTooltip>
                                    <ButtonWithTooltip id="PreviousRouteButton" color='primary' 
                                        onClick={previousRoute} disabled={this.state.currentRouteIndex <= 0} 
                                        placement="top" tooltipText="Edit the previous route">
                                            <MdNavigateBefore/>
                                    </ButtonWithTooltip>
                                    <ButtonWithTooltip id="NextRouteButton" color='primary' 
                                        onClick={nextRoute} disabled={this.state.currentRouteIndex >= this.state.routes.length - 1} 
                                        placement="top" tooltipText="Edit the next route">
                                            <MdNavigateNext/>
                                    </ButtonWithTooltip>
                                </ButtonGroup>
                                <ButtonGroup>
                                    <ButtonWithTooltip id="SimplifyRouteButton" color='primary' 
                                        onClick={generalizeRoute} disabled={this.state.routes.length === 0} 
                                        placement="top" tooltipText="Simplify route for current zoom level">
                                            <MdTimeline/>
                                    </ButtonWithTooltip>
                                    <ButtonWithTooltip id="JoinRouteButton" color='primary' 
                                        onClick={joinRoute} disabled={this.state.currentRouteIndex >= this.state.routes.length - 1} 
                                        placement="top" tooltipText="Join current route with the next route">
                                            <GiJoint/>
                                    </ButtonWithTooltip>
                                    <ButtonWithTooltip id="SplitRouteButton" color={this.state.splitMode ? 'danger' : 'primary'} 
                                        onClick={splitRoute} disabled={this.state.currentRouteIndex < 0} 
                                        placement="top" tooltipText="Split the current route at the next vertex clicked">
                                            <MdContentCut/>
                                    </ButtonWithTooltip>
                                    <ButtonWithTooltip id="SwapRouteButton" color='primary' 
                                        onClick={swapRoute} disabled={this.state.currentRouteIndex >= this.state.routes.length - 1} 
                                        placement="top" tooltipText="Swap the current route with the next route">
                                            <IoMdSwap/>
                                    </ButtonWithTooltip>
                                    <ButtonWithTooltip id="ReverseRouteButton" color='primary' 
                                        onClick={reverseRoute} disabled={this.state.currentRouteIndex < 0} 
                                        placement="top" tooltipText="Reverse the direction of the current route">
                                            <AiOutlineRollback/>
                                    </ButtonWithTooltip>
                                </ButtonGroup>
                                <ButtonGroup>
                                    <ButtonWithTooltip id="AddRouteButton" color='primary' 
                                        onClick={addRoute} disabled={false} 
                                        placement="top" tooltipText="Add new route">
                                        <MdAddCircle/>
                                    </ButtonWithTooltip>
                                    <ButtonWithTooltip id="DeleteRouteButton" color='primary' 
                                        onClick={deleteRoute} disabled={this.state.routes.length === 0}  
                                        placement="top" tooltipText="Delete current route">
                                            <MdClear/>
                                    </ButtonWithTooltip>
                                    <ButtonWithTooltip id="ClearAllRoutesButton" color='primary' 
                                        onClick={clearAllRoutes} disabled={this.state.routes.length === 0}  
                                        placement="top" tooltipText="Clear all routes">
                                            <MdClearAll/>
                                    </ButtonWithTooltip>
                                    <ButtonWithTooltip id="UndoButton1" color='primary' 
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
                            <Col sm={1}>
                                <Button hidden={!this.state.busy}>{[ '', Spinner ]}</Button>
                            </Col>
                        </Row>
                    </TabPane>
                    <TabPane tabId="RoutesArchive">
                        <Row className="mb-2 ml-1"><FormText color='muted'>Import routes from the routes archive</FormText></Row>
                        <Row className="mb-2">
                            <Col sm={2}>
                                <ButtonGroup>
                                    <ButtonWithTooltip id="ZoomToRoutesButton3" color='primary' 
                                        onClick={zoomToRoutes} disabled={this.state.routes.length === 0} 
                                        placement="top" tooltipText="Zoom to route extents">
                                            <MdZoomOutMap/>
                                    </ButtonWithTooltip>
                                    <ButtonWithTooltip id="UndoButton2" color='primary' 
                                        onClick={undoLastRouteEditWithoutContinue} disabled={!this.state.canUndoLastRouteEdit} 
                                        placement="top" tooltipText="Undo last change">
                                            <MdUndo/>
                                    </ButtonWithTooltip>
                                    {/* <ButtonWithTooltip id="UpdateArchivedRoutesSummary" color='danger' 
                                        onClick={updateArchivedRouteSummary} disabled={false}
                                        placement="top" tooltipText="Update archived route summary">
                                            <MdWarning/>
                                    </ButtonWithTooltip> */}
                                </ButtonGroup>
                            </Col>
                            <Col sm={6}>
                                <ReactTags tags={[]}
                                    suggestions={this.state.archivedRouteSuggestions}
                                    handleDelete={handleArchivedRouteDelete}
                                    handleAddition={handleArchivedRouteAddition}
                                    delimiters={delimiters}
                                    placeholder={'Start typing to add a route by name'} />
                            </Col>
                            <Col sm={1}>
                                <Button hidden={!this.state.busy}>{[ '', Spinner ]}</Button>
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

    private setUpMap(): void {
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
        this.recordLastRouteEdit(this.props.routesAsJson); // prime the undo stack but don't notify as a change
        this.setState({ currentRouteIndex: this.currentRouteIndex, routes: this.routes });

        this.showInitiallySelectedMaps();
        this.fitBounds();

        this.map.on('editable:vertex:click', (event: any) => {
            if (this.state.splitMode) {
                this.endRoute();
                this.splitRoute(event.vertex as L.VertexMarker);
                this.saveRouteChange();
                this.continueRoute();
            }
        });

        // ---------
        // info control
        this.infoControl = (L as any).control();
        const infoControl: any = this.infoControl;
        infoControl.onAdd = () => {
            infoControl._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
            return infoControl._div;
        };
        infoControl.update = (html: string) => {
            infoControl._div.innerHTML = html;
        };

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
    // Map selection
    // -------------------------------------------------------

    private showInitiallySelectedMaps(): void {
        const initialMapSheets = this.mapSheets;
        this.clearAllSelectedMapsWithoutSave();
        this.addSelectedMapsWithoutSave(initialMapSheets);
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
        this.clearAllSelectedMapsWithoutSave();
        this.saveSelectedMaps();
    }

    private clearAllSelectedMapsWithoutSave(): void {
        this.unhighlightMaps(this.mapSheets);
        this.mapSheets = [];
        this.setTags();
    }

    private addSelectedMaps(addedMapSheets: string[]): void {
        this.addSelectedMapsWithoutSave(addedMapSheets);
        this.saveSelectedMaps();
    }

    private addSelectedMapsWithoutSave(addedMapSheets: string[]): void {
        this.highlightMaps(addedMapSheets);
        this.mapSheets = this.mapSheets.concat(addedMapSheets);
        this.setTags();
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

    private highlightSelectedMaps(): void {
        this.highlightMaps(this.mapSheets);
    }

    private unhighlightSelectedMaps(): void {
        this.unhighlightMaps(this.mapSheets);
    }

    private highlightMaps(mapSheets: string[]): void {
        mapSheets.forEach((mapSheet: string) => {
            this.highlightMapSheet(mapSheet);
        });
    }

    private unhighlightMaps(mapSheets: string[]): void {
        mapSheets.forEach((addedMapSheet: string) => {
            this.unhighlightMapSheet(addedMapSheet);
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

    // -------------------------------------------------------
    // Route editing
    // -------------------------------------------------------

    private continueRoute() {
        if (this.routes.length > 0) {
            const currentRoute = this.routes[this.currentRouteIndex];
            currentRoute.enableEdit();
            this.setRouteEventsOn(currentRoute);
            ((currentRoute as any).editor as L.PolylineEditor).continueForward();
        } else {
            this.addRoute();
        }
        this.adjustRoutePositionIndicators(true);
        this.setState({ splitMode: false });

        this.infoControl.addTo(this.map);
        (this.infoControl as any).update('<b>Editing route ' + (this.currentRouteIndex + 1).toString() + ' of ' + this.routes.length.toString() + '</b>');
    }

    private endRoute(): void {
        if (this.routes.length > 0) {
            const currentRoute = this.routes[this.currentRouteIndex];
            this.setRouteEventsOff(currentRoute);
            currentRoute.disableEdit();
            if (currentRoute.getLatLngs().length === 0) {
                currentRoute.remove(); // purge empty routes
                this.routes.splice(this.currentRouteIndex, 1);
                this.setState({ routes: this.routes });
            }
            this.currentRouteIndex = Math.min(this.currentRouteIndex, this.routes.length - 1)
            this.adjustRoutePositionIndicators();
        };
        
        this.infoControl.remove();
    }

    // --------

    private addRoute(): void {
        if (this.routes.length > 0 && this.routes[this.routes.length - 1].getLatLngs().length === 0) {
            return; // use existing empty route
        }
        const route = this.map.editTools.startPolyline(undefined, {});
        this.setRouteEventsOn(route);
        this.routes.push(route);
        this.currentRouteIndex = this.routes.length - 1;
        this.adjustRoutePositionIndicators();
        this.setState({ currentRouteIndex: this.currentRouteIndex, routes: this.routes });
    }

    private deleteRoute(): void {
        if (this.routes.length > 0) {
            const currentRoute = this.routes[this.currentRouteIndex];
            this.setRouteEventsOff(currentRoute);
            currentRoute.disableEdit();
            currentRoute.remove();
            this.routes.splice(this.currentRouteIndex, 1);
            this.currentRouteIndex = Math.min(this.currentRouteIndex, this.routes.length - 1)
            this.adjustRoutePositionIndicators();
            this.setState({ currentRouteIndex: this.currentRouteIndex, routes: this.routes });
        };
    }

    private clearAllRoutes(): void {
        this.routes.forEach((route: L.Polyline) => {
            this.setRouteEventsOff(route);
            route.disableEdit();
            route.remove();
        });
        this.routes = [];
        this.currentRouteIndex = -1;
        this.adjustRoutePositionIndicators();
        this.setState({ currentRouteIndex: this.currentRouteIndex, routes: this.routes });
    }

    private previousRoute(): void {
        if (this.currentRouteIndex > 0) {
            this.currentRouteIndex = this.currentRouteIndex - 1;
            this.setState({ currentRouteIndex: this.currentRouteIndex });
            this.adjustRoutePositionIndicators();
        }
    }

    private nextRoute(): void {
        if (this.currentRouteIndex < this.routes.length - 1) {
            this.currentRouteIndex = this.currentRouteIndex + 1;
            this.setState({ currentRouteIndex: this.currentRouteIndex });
            this.adjustRoutePositionIndicators();
        }
    }

    private joinNextRoute(): void {
        if (this.currentRouteIndex < this.routes.length - 1) {
            const currentRoute = this.routes[this.currentRouteIndex];
            const nextRoute = this.routes[this.currentRouteIndex + 1];
            nextRoute.setLatLngs((currentRoute.getLatLngs() as L.LatLng[][]).concat(nextRoute.getLatLngs() as L.LatLng[][]));
            this.deleteRoute();
            this.adjustRoutePositionIndicators();
        }
    }

    private swapNextRoute(): void {
        if (this.currentRouteIndex < this.routes.length - 1) {
            const currentRoute = this.routes[this.currentRouteIndex];
            const nextRoute = this.routes[this.currentRouteIndex + 1];
            const currentRouteLatLngs = currentRoute.getLatLngs();
            currentRoute.setLatLngs(nextRoute.getLatLngs());
            nextRoute.setLatLngs(currentRouteLatLngs);
            this.adjustRoutePositionIndicators();
        }
    }

    private reverseRoute(): void {
        if (this.currentRouteIndex >= 0) {
            const currentRoute = this.routes[this.currentRouteIndex];
            currentRoute.setLatLngs(currentRoute.getLatLngs().reverse());
            this.adjustRoutePositionIndicators();
        }
    }

    private splitRoute(vertex: L.VertexMarker) {
        if (this.currentRouteIndex >= 0) {
            const currentRoute = this.routes[this.currentRouteIndex];
            const latLngs: L.LatLng[] = currentRoute.getLatLngs() as L.LatLng[];
            const index = vertex.getIndex();
            if (index > 0 && index < latLngs.length) {
                const firstPart = latLngs.slice(0, index + 1);
                currentRoute.setLatLngs(firstPart);
                let secondPart: L.LatLng[] = [];
                secondPart.push(new L.LatLng(vertex.getLatLng().lat, vertex.getLatLng().lng)); // clone shared latLng
                if (index < latLngs.length - 1) {
                    secondPart = secondPart.concat(latLngs.slice(index + 1));
                }
                const newRoute = L.polyline(secondPart, {}).addTo(this.map);
                this.setRouteEventsOn(newRoute);
                this.routes.push(newRoute);
                this.currentRouteIndex = this.currentRouteIndex + 1;
                this.adjustRoutePositionIndicators();
                this.setState({ currentRouteIndex: this.currentRouteIndex, routes: this.routes });
            }
        }
    }

    private setRouteEventsOn(route: L.Polyline) {
        route.on('editable:editing', () => {
            if (!this.vertexIsDragging) {
                this.saveRouteChange();
            }
        });
        route.on('editable:vertex:dragstart', () => { 
            this.vertexIsDragging = true; 
        });
        route.on('editable:vertex:dragend', () => { 
            this.vertexIsDragging = false; 
            this.saveRouteChange();
        });
    }

    private setRouteEventsOff(route: L.Polyline) {
        route.off('editable:vertex:dragstart');
        route.off('editable:vertex:dragend');
        route.off('editable:editing');
    }

    private importGpxFromFile(gpxFile: File): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!gpxFile) {
                reject();
            }
            const reader = new FileReader();
    
            reader.onload = () => {
                this.setState({ busy: true });
                const gpx = reader.result as string;
                this.importGpx(gpx)
                    .then(() => resolve(), () => reject());
            };
    
            reader.readAsText(gpxFile);
        });
    }

    private importGpx(gpx: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.setState({ busy: true });
            const zoom = this.map.getZoom();
            const tolerance = this.getTolerance(Math.max(12, zoom));  // don't generalize too harshly when zoomed out
            new L.GPX(gpx, {
                async: true, 
                polyline_options: {},
                gpx_options:{
                    parseElements: ['track', 'route'] as any // yuk!
                },
                marker_options: {}
            }).on('addline', (event: any) => {
                const gpxLatLngs = (event.line as L.Polyline).getLatLngs() as L.LatLng[];
                const generalizedLatLngs = this.generalize(gpxLatLngs, tolerance);
                if (generalizedLatLngs.length > 0) {
                    const route = L.polyline(generalizedLatLngs, {}).addTo(this.map);
                    this.routes.push(route);
                    this.currentRouteIndex = this.routes.length - 1;
                    this.adjustRoutePositionIndicators();
                    this.setState({ currentRouteIndex: this.currentRouteIndex, routes: this.routes });
                }
            }).on('loaded', (event: Event) => {
                this.fitBounds();
                this.setState({invalidGpxFile: false, busy: false });
                resolve();
            }).on('error', (event: any) => {
                this.setState({invalidGpxFile: true, busy: false })
                alert('Error loading file: ' + event.err);
                reject();
            });
        });
    }

    private generalizeRoute(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.setState({ busy: true });
            setTimeout(() => {
                const zoom = this.map.getZoom();
                const tolerance = this.getTolerance(zoom);
                if (this.routes.length > 0) {
                    const currentRoute = this.routes[this.currentRouteIndex];
                    const generalizedLatLngs: L.LatLng[] = this.generalize(currentRoute.getLatLngs() as L.LatLng[], tolerance);
                    this.setRouteEventsOff(currentRoute);
                    currentRoute.disableEdit();
                    currentRoute.remove();
                    if (generalizedLatLngs.length > 0) {
                        const generalizedRoute = L.polyline(generalizedLatLngs, {}).addTo(this.map);
                        this.routes[this.currentRouteIndex] = generalizedRoute;
                    }
                }
                this.adjustRoutePositionIndicators();
                this.setState({ routes: this.routes, busy: false });
                resolve();
            }, 0);
        });
    }

    private getTolerance(zoom: number): number {
        return 22 + 240000 * Math.exp(-0.6 * zoom);
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
                if (this.map.distance(latLng, lastLatLng) >= tolerance) {
                    generalizedLatLngs.push(latLng);
                    lastLatLng = latLng;
                }
            }
        });
        return generalizedLatLngs;
    }

    private saveRouteChange(): void {
        const routesAsJSON: string = this.getRoutesAsJson();
        this.props.onRoutesChanged(routesAsJSON);
        this.recordLastRouteEdit(routesAsJSON);
        this.setState({ canUndoLastRouteEdit: this.routesUndoStack.length > 1 });
    }

    private recordLastRouteEdit(routesAsJSON: string): void {
        this.routesUndoStack.push({ routesAsJSON, currentRouteIndex: this.currentRouteIndex });
        // console.log(">>>>> " + this.routesUndoStack.length + ", " + routesAsJSON);
        this.setState({ canUndoLastRouteEdit: this.routesUndoStack.length > 1 });
    }

    private undoLastRouteEdit(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.routesUndoStack.length > 1) { // always leave the orignal on the stack
                this.setState({ busy: true });
                setTimeout(() => {
                    if (this.routesUndoStack.length > 1) { // always leave the orignal on the stack
                        let undoStackItem = this.routesUndoStack.pop(); // discard this
                        undoStackItem = this.routesUndoStack[this.routesUndoStack.length - 1];
                        const routesAsJSON = undoStackItem.routesAsJSON;
                        // console.log("<<<< " + this.routesUndoStack.length + ", " + routesAsJSON);
                        this.setRoutesFromJson(routesAsJSON);
                        this.currentRouteIndex = undoStackItem.currentRouteIndex;
                        this.props.onRoutesChanged(routesAsJSON);
                        this.setState({ 
                            canUndoLastRouteEdit: this.routesUndoStack.length > 1, 
                            busy: false,
                            currentRouteIndex: this.currentRouteIndex, 
                            routes: this.routes });
                    }
                    resolve();
                }, 0);
            } else {
                resolve();
            }
        });
    }

    private getRoutesAsJson(): string {
        return JSON.stringify(this.routes.map((route: L.Polyline) => {
            return (route.getLatLngs() as L.LatLng[]).map((latLng: L.LatLng) => {
                return [latLng.lat, latLng.lng]
            });
        }));
    }

    private setRoutesFromJson(routesAsJson: string): void {
        this.clearAllRoutes();
        if (routesAsJson) {
            const routesLatLngs: L.LatLng[][] = JSON.parse(routesAsJson);
            routesLatLngs.forEach(routeLatLngs => {
                this.routes.push(L.polyline(routeLatLngs, {}).addTo(this.map));
                this.currentRouteIndex = this.routes.length - 1;
            });
            this.adjustRoutePositionIndicators();
        }
    }

    private adjustRoutePositionIndicators(suppressCurrentRouteMarker: boolean = false) {
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
                    if (!suppressCurrentRouteMarker || index !== this.currentRouteIndex) {
                        const label: string = this.routes.length > 1 ? (index + 1).toString() : ""; // no label if only one route
                        const divIcon = L.divIcon({
                            className: 'route-marker-div-icon',
                            html: "<div style='background-color:" + color + ";' class='marker-ring'></div><i>" + label + "</i>",
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        });
                        const routeMarker = L.marker(latLngs[0], { icon: divIcon }).addTo(this.map);
                        this.routeMarkers.push(routeMarker);
                    }
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
            this.map.fitBounds(bounds);
        }
    }

    // -------------------------------------------------------
    // Routes Archive
    // -------------------------------------------------------

    private showArchivedRoutes(): void {

        const infoControl: any = this.infoControl;
        const defaultInfoControlMessage: string = 'Hover over a route for details.  Click to import.';

        if (!this.archivedRoutesLayerGroup) {
            this.archivedRoutesLayerGroup = L.layerGroup()
                .addTo(this.map);
            this.infoControl
                .addTo(this.map);
    
            // -----
            const polylineOptions: any = {color: 'green', weight: 5, opacity: 0.4};
            Object.keys(this.props.archivedRoutesById).map((id: string) => {
                const archivedRoute: IArchivedRoute = this.props.archivedRoutesById[id];
                if (archivedRoute.routesummary) {
                    const routesLatLngsArray: L.LatLng[][] = JSON.parse(archivedRoute.routesummary);
                    // the route summary polylines
                    const polylines = routesLatLngsArray.map((routeLatLngs: L.LatLng[]) => 
                        L.polyline(routeLatLngs, polylineOptions).addTo(this.archivedRoutesLayerGroup)
                    );
                    polylines.forEach(polyline => {
                        // add click event handler for polyline
                        (polyline as any).archivedRoute = archivedRoute;
                        polyline.on('click', event => {
                            this.selectArchivedRoute(archivedRoute.id);
                        });

                        polyline.on('mouseover', event => {
                            polylines.forEach(p => { p.setStyle({weight: 10, opacity: 0.7})} );
                            infoControl.update('<b>' + archivedRoute.caption + '</b><br /><p>' + archivedRoute.routenotes + '</p>');
                        });
                        polyline.on('mouseout', event => {
                            polylines.forEach(p => { p.setStyle(polylineOptions)} );
                            infoControl.update(defaultInfoControlMessage);
                        });
                    });
                }
            });
        } else {
            this.archivedRoutesLayerGroup
                .addTo(this.map);
            this.infoControl
                .addTo(this.map);
        }

        infoControl.update(defaultInfoControlMessage);
    }

    private hideArchivedRoutes(): void {
        if (this.archivedRoutesLayerGroup) {
            this.archivedRoutesLayerGroup
                .removeFrom(this.map);
            this.infoControl
                .remove();
        }
    }

    private selectArchivedRoute(archivedRouteId: string) {
        this.setState({ busy: true });
        this.props.getArchivedRoute(archivedRouteId)
            .then((archivedRoute: IArchivedRoute) => {
                const gpxFile = undefined;
                this.setState( {gpxFile});
                this.importGpx(archivedRoute.gpx).then(() => {
                    this.saveRouteChange();
                })
            });

    }

    // private updateArchivedRouteSummary() {
    //     this.setState({ busy: true });

    //     Object.keys(this.props.archivedRoutesById).map((archivedRouteId: string) => {
    //         this.props.getArchivedRoute(archivedRouteId)
    //             .then((archivedRoute: IArchivedRoute) => {
    //                 const gpxLatLngsArray: L.LatLng[][] = [];
    //                 if (archivedRoute.gpx) {
    //                     const tolerance = this.getTolerance(10);
    //                     const decimalPlaces = 3;
    //                     new L.GPX(archivedRoute.gpx, {
    //                         async: true, 
    //                         polyline_options: {},
    //                         gpx_options:{
    //                             parseElements: ['track', 'route'] as any // yuk!
    //                         },
    //                         marker_options: {}
    //                     }).on('addline', (event: any) => {
    //                         const gpxLatLngs = (event.line as L.Polyline).getLatLngs() as L.LatLng[];
    //                         const generalizedLatLngs = this.generalize(gpxLatLngs, tolerance);
    //                         if (generalizedLatLngs.length > 0) {
    //                             gpxLatLngsArray.push(generalizedLatLngs);
    //                         }
    //                     }).on('loaded', (event: Event) => {
    //                         const routesSummary: string = JSON.stringify(gpxLatLngsArray.map((gpxLatLngs: L.LatLng[]) => {
    //                             return gpxLatLngs.map((latLng: L.LatLng) => {
    //                                 return [parseFloat(latLng.lat.toFixed(decimalPlaces)), parseFloat(latLng.lng.toFixed(decimalPlaces))]
    //                             })
    //                         }));
    //                         console.log(routesSummary);
    //                         this.props.updateArchivedRouteSummary(archivedRouteId, routesSummary)
    //                             .then(() => {
    //                                 this.setState({invalidGpxFile: false, busy: false });
    //                             });

    //                     }).on('error', (event: any) => {
    //                         this.setState({invalidGpxFile: true, busy: false })
    //                         alert('Error loading file: ' + event.err);
    //                     });                    
    //                 }
    //             });
    //     });
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
            <div id={this.props.id}>
                <Button color={this.props.color} disabled={this.props.disabled} onClick={this.props.onClick} >{this.props.children}</Button>
            </div>
            <Tooltip target={this.props.id} isOpen={this.state.tooltipOpen} placement={this.props.placement} toggle={toggle}>{this.props.tooltipText}</Tooltip>
        </div>
    }
}