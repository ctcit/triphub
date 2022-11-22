import * as L from 'leaflet';
import * as React from 'react';
import { ButtonGroup, Modal, ModalHeader, ModalBody, ModalFooter, Col, Row, FormText, ButtonDropdown, DropdownItem, DropdownToggle, DropdownMenu, Button } from 'reactstrap';
import { MapEditor } from './MapEditor/MapEditor';
import { IMap, IArchivedRoute, ITrip } from './Interfaces';
import { ResizableBox, ResizeCallbackData } from 'react-resizable';
import { ButtonWithTooltip } from './ButtonWithTooltip';
import { ControlWrapper } from './Control';
import { MapCommon, NZ50MapPolygon } from './MapCommon';
import memoizeOne from 'memoize-one';
import { MdGridOff, MdInfo /* , MdMap */ } from 'react-icons/md';
import Select, { ActionMeta } from 'react-select'

export class TripMap extends MapCommon<{
    app: App
    routesId: string,
    routesLabel: string,
    mapsId: string,
    mapsLabel: string,
    hidden?: boolean,
    hiddenMap?: boolean,
    hiddenRoute?: boolean,
    readOnly?: boolean,
    isLoading?: boolean,
    list? : any,
    isOnline: boolean,
    onGet: (id: string) => any,
    onSave: (id: string, value: any) => Promise<ITrip>,
    onGetValidationMessage?: (id: string) => string,
    leafletMapId: string,
}, {
    savingMapSheets: boolean,
    savingRoutes: boolean,
    mapVisible: boolean,
    editing: boolean,
    editsMade: boolean,
    cancelDropdownOpen: boolean,
    archivedRoutes: IArchivedRoute[],
    archivedRouteSuggestions: { value: any, label: string }[],
    busy: boolean, // loading archivedRoutes
    mapSheetSuggestions: { value: any, label: string }[]
}>{
    // selected map sheets
    private pendingMapSheets: string[] = []; // changed mapSheets before being saved

    // routes
    private pendingRoutesLatLngs: Array<Array<[number, number]>> = [];  // changed routes before being saved

    private mounted: boolean = false;

    private memoizedGetArchivedRoutes = memoizeOne((loadArchivedRoutes: boolean) => {
        if (loadArchivedRoutes) {
            this.setState({ busy: true }, async () => {
                this.props.app.getArchivedRoutes(false, false)
                    .then((archivedRoutes: IArchivedRoute[]) => {
                        const archivedRouteSuggestions = archivedRoutes.map((archivedRoute: IArchivedRoute) => {
                            return { value: archivedRoute.id, label: archivedRoute.title };
                        });
                        if (this.mounted) {
                            this.setState({ archivedRoutes, archivedRouteSuggestions, busy: false });
                        }
                    });
            });
        }
    });

    constructor(props: any) {
        super(props);

        const routesAsLatLngs: Array<Array<[number, number]>> = this.getRoutes();
        this.mapSheets = this.getMapSheets();

        this.pendingRoutesLatLngs = routesAsLatLngs || [];
        this.pendingMapSheets = this.mapSheets;

        this.state = {
            savingMapSheets: false,
            savingRoutes: false,
            mapVisible: routesAsLatLngs && routesAsLatLngs.length > 0,
            editing: false,
            editsMade: false,
            cancelDropdownOpen: false,
            archivedRoutes: [],
            archivedRouteSuggestions: [],
            busy: true,
            mapSheetSuggestions: Object.keys(this.props.nz50MapsBySheet).map((mapSheet: string) => {
                const nz50Map: IMap = this.props.nz50MapsBySheet[mapSheet];
                return { value: nz50Map.sheetCode, label: nz50Map.sheetCode + ' ' + nz50Map.name };
            })
        };
    }

    public componentDidMount() {
        this.mounted = true;
        this.memoizedGetArchivedRoutes(!(this.props.readOnly ?? true));

        if (this.state.mapVisible) {
            this.setUpMap();
        }
    }

    public componentWillUnmount() {
        this.mounted = false;
    }

    public render() {
        const onEdit = () => {
            this.setState({ editsMade: false, editing: true });
        }

        // changed in MapEditor - save deferred
        const onMapSheetsChanged = (mapSheets: string[]) => {
            this.pendingMapSheets = mapSheets;
            this.setState({ editsMade: true });
        }
        const onRoutesChanged = (routesAsLatLngs: Array<Array<[number, number]>>) => {
            this.pendingRoutesLatLngs = routesAsLatLngs;
            this.setState({ editsMade: true });
        }

        const onSave = () => {
            this.Save(this.pendingMapSheets, this.pendingRoutesLatLngs);
        }
        const onCancel = () => {
            this.setState({ editsMade: false, editing: false });
        }
        const onCancelDropdownToggle = () => {
            this.setState({ cancelDropdownOpen: !this.state.cancelDropdownOpen });
        }

        // changed in TripMap - save immediate
        const onChange = (newMapsValue: any, actionMeta: ActionMeta<any>) => {
            this.saveSelectedMaps(newMapsValue.map((m: {value: string, label: string}) => m.value));
        }
        const onSelectRouteMaps = () => this.selectRouteMaps();

        const onResize = (e: React.SyntheticEvent, data: ResizeCallbackData) => {
            this.resizeMap(data.size.height, data.size.width);
        }

        // changed in TripMap - save immediate
        const onArchivedRouteChange = (newRouteValue: any, actionMeta: ActionMeta<any>) => {
            if (actionMeta.action === 'select-option') {
                this.selectArchivedRoute(newRouteValue.value);
            } else if (actionMeta.action === 'clear') {
                this.clearRoute();
            }
        }

        return (
            <div>
                <Row>
                    <Col>
                        <ControlWrapper id={this.props.routesId} field={this.props.routesId} label={this.props.routesLabel} hidden={this.props.hidden} isLoading={this.props.isLoading} onGetValidationMessage={this.props.onGetValidationMessage} saving={this.state.savingRoutes} >
                        { !this.state.mapVisible &&
                            <FormText color="muted">No routes specified&nbsp;&nbsp;</FormText>
                        }
                        { this.state.mapVisible &&
                            <ResizableBox width={this.initialWidth} height={this.initialHeight} minConstraints={[200, 200]} onResize={onResize}>
                                <div id="tripmap"/>
                            </ResizableBox>
                        }
                        { !this.props.readOnly && this.props.isOnline &&
                                <ButtonGroup>
                                    <Select
                                        autoFocus={false}
                                        isMulti={false}
                                        isClearable={true}
                                        isSearchable={true}
                                        options={this.state.archivedRouteSuggestions}
                                        onChange={onArchivedRouteChange}
                                        delimiter=','
                                        placeholder={'Start typing to add a route from the archives by name'}
                                        isDisabled={this.props.readOnly}
                                        styles={{ control: (provided: any, state: any) => ({
                                                ...provided,
                                                minWidth: '300px'
                                            })}}
                                    />
                                    <a href="https://youtu.be/77B6EzYLcmo" target="_blank">
                                        <MdInfo size="36" color="#6899e4" style={{ padding: '7px' }} />
                                    </a>
                                </ButtonGroup>
                            }
                        </ControlWrapper>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <ControlWrapper id={this.props.mapsId} field={this.props.mapsId} label={this.props.mapsLabel} hidden={this.props.hidden} isLoading={this.props.isLoading} onGetValidationMessage={this.props.onGetValidationMessage} saving={this.state.savingMapSheets} >
                        {
                            this.mapSheets.length === 0 &&
                                <FormText color="muted">No maps selected&nbsp;&nbsp;</FormText>
                        }
                        { ((this.props.readOnly && this.mapSheets.length > 0) || !this.props.readOnly) &&
                            <ButtonGroup>
                                <Select
                                    autoFocus={false}
                                    value={this.getTags()}
                                    isMulti={true}
                                    isSearchable={true}
                                    options={this.state.mapSheetSuggestions}
                                    onChange={onChange}
                                    delimiter=','
                                    placeholder={'Start typing to add a map sheet by name'}
                                    isDisabled={this.props.readOnly}
                                    styles={{ control: (provided: any, state: any) => ({
                                            ...provided,
                                            minWidth: '300px'
                                        })}}
                                />
                                { !this.props.readOnly &&
                                    <ButtonWithTooltip id="SelectMapsOverlappingRouteButton" color='secondary' 
                                        onClick={onSelectRouteMaps} disabled={!this.routes || this.routes.length === 0 }  
                                        placement="top" tooltipText="Select maps overlapping the route">
                                            <MdGridOff/>
                                    </ButtonWithTooltip>
                                }
                                { !this.props.readOnly && this.props.isOnline &&
                                    <a href="https://youtu.be/ybP2xjWb0t0" target="_blank">
                                        <MdInfo size="36" color="#6899e4" style={{padding: '7px'}}/>
                                    </a>
                                }
                            </ButtonGroup>
                        }
                        </ControlWrapper>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        { !this.props.readOnly && this.props.isOnline &&
                            <ButtonGroup>
                                <Button onClick={onEdit}>
                                    <span className='fa fa-map' />
                                    {this.props.hiddenRoute ? 'Pick map' : 'Edit Maps/Routes (Advanced)'}
                                </Button>
                                <a href="https://youtu.be/mF0jPHLjanI" target="_blank">
                                    <MdInfo size="36" color="#6899e4" style={{ padding: '7px' }} />
                                </a>
                            </ButtonGroup>
                        }
                        <Modal isOpen={this.state.editing} toggle={onSave}
                            size="lg" style={{ maxWidth: '1600px', width: '95%', margin: '10px auto' }} centered={true}>
                            <ModalHeader toggle={onSave}>Edit Routes/Maps</ModalHeader>
                            <ModalBody>
                                <MapEditor
                                    app={this.props.app}
                                    hiddenMap={this.props.hiddenMap}
                                    hiddenRoute={this.props.hiddenRoute}
                                    mapSheets={this.mapSheets}
                                    routesAsLatLngs={this.getRoutesAsLatLngs()}
                                    onMapSheetsChanged={onMapSheetsChanged}
                                    onRoutesChanged={onRoutesChanged}
                                />
                            </ModalBody>
                            <ModalFooter>
                                {!this.state.editsMade && <Button color="secondary" onClick={onCancel}>Close</Button>}
                                {this.state.editsMade && <Button color="primary" onClick={onSave}>Save</Button>}
                                {this.state.editsMade &&
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
                if (parts.length > 0 && this.props.app.maps[parts[0]]) {
                    mapSheets.push(parts[0]);
                }
            }
        });
        return mapSheets;
    }

    private getRoutes(): Array<Array<[number, number]>> {
        return this.props.onGet("routes") as Array<Array<[number, number]>>;
    }

    // -----------------

    private selectArchivedRoute(archivedRouteId: number): void {
        this.setState({ busy: true });
         this.props.getArchivedRoute(archivedRouteId)
             .then(async (archivedRoute?: IArchivedRoute) => {
                 if (archivedRoute) {
                    this.saveSelectedRoute(archivedRoute.routes);
                 }
             })
            .finally(() => {
                this.setState({ busy: false });
            });
    }

    private clearRoute(): void {
        this.saveSelectedRoute([]);
    }

    private saveSelectedRoute(routesAsLatLngs: Array<Array<[number, number]>>): void {
        this.Save(null, routesAsLatLngs);
    }

    // -----------------

    private getTags(): { value: any, label: string }[] {
        if (!this.mapSheets) {
            return [];
        }
        return this.mapSheets.map((mapSheet: string) => 
            ({ value: mapSheet, label: this.mapSheetWithName(mapSheet) }));
    }

    private selectRouteMaps(): void {
        const x = this.nz50LayerGroup.getLayers() as NZ50MapPolygon[];
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
        this.saveSelectedMaps(mapSheets);
    }

    private clearRouteMaps(): void {
        this.saveSelectedMaps([]);
    }

    private saveSelectedMaps(mapSheets: string[]): void {
        this.Save(mapSheets, null);
    }

    // -----------------

    private Save = (mapSheets: string[] | null, routesAsLatLngs: Array<Array<[number, number]>> | null): void => {
        const state: any = { editsMade: false, editing: false };
        if (mapSheets) {
            state.savingMapSheets = true;
        }
        if (routesAsLatLngs) {
            state.savingRoutes = true;
        }
        this.setState(state, async () => {

            const promises = [];

            if (routesAsLatLngs) {
                if (routesAsLatLngs.length === 1 && routesAsLatLngs[0].length === 0) {
                    routesAsLatLngs = [];
                }
                this.pendingRoutesLatLngs = routesAsLatLngs;
                const mapVisible: boolean = routesAsLatLngs.length > 0;
                this.setState({ mapVisible }, async () => {
                    if (mapVisible) {
                        this.setUpMap();
                    }
                    this.setRoutesFromLatLngs(routesAsLatLngs as Array<Array<[number, number]>>);
                    this.fitBounds();
                    promises.push(this.props.onSave('routes', routesAsLatLngs));
                });
            }

            if (mapSheets) {
                this.mapSheets = mapSheets;
                this.pendingMapSheets = mapSheets;
                promises.push(this.props.onSave('maps', mapSheets
                    .filter(mapSheet => mapSheet)
                    .map(mapSheet => mapSheet + " " + this.props.app.maps[mapSheet].name)));
            }

            return Promise.all(promises)
                .then(() => Promise.resolve(), () => Promise.resolve())
                .then(() => this.setState({ savingMapSheets: false, savingRoutes: false }));
        });
    }

}