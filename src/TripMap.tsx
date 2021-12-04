import * as L from 'leaflet';
import * as React from 'react';
import { ButtonGroup, Modal, ModalHeader, ModalBody, ModalFooter, ListGroup, ListGroupItem, Col, Row, FormText, ButtonDropdown, DropdownItem, DropdownToggle, DropdownMenu, Form, Container } from 'reactstrap';
import { MapEditor } from './MapEditor/MapEditor';
import Button from 'reactstrap/lib/Button';
import { IMap, IArchivedRoute } from './Interfaces';
import { ResizableBox, ResizeCallbackData } from 'react-resizable';
import { ButtonWithTooltip } from './ButtonWithTooltip';
import { ButtonWithConfirm } from './ButtonWithConfirm';
import { ControlWrapper } from './Control';
import { MapCommon } from './MapCommon';
import { Tag, WithContext as ReactTags } from 'react-tag-input';
import memoizeOne from 'memoize-one';
import { MdClear, MdInfo /* , MdMap */ } from 'react-icons/md';

const KeyCodes = {
    comma: 188,
    enter: 13,
  };
   
const delimiters = [KeyCodes.comma, KeyCodes.enter];

export class TripMap extends MapCommon<{
    routesId : string, 
    routesLabel : string,
    mapsId : string, 
    mapsLabel : string,
    hidden? : boolean,
    readOnly? : boolean,
    isLoading?: boolean,
    list? : any,
    onGet: (id: string) => any,
    onSave: (id: string, value: any) => Promise<void>,
    onGetValidationMessage?: (id: string) => string,
    leafletMapId: string,
    nz50MapsBySheet: { [mapSheet: string] : IMap },
    getArchivedRoutes: (includeHidden: boolean, force: boolean) => Promise<IArchivedRoute[]>,
    getArchivedRoute: (routeId: number) => Promise<IArchivedRoute | undefined> // TODO - replace with service
},{
    savingMapSheets : boolean,
    savingRoutes: boolean,
    mapVisible: boolean,
    editing: boolean,
    editsMade: boolean,
    cancelDropdownOpen: boolean,
    archivedRoutes: IArchivedRoute[],
    archivedRouteSuggestions: Tag[],
    busy: boolean, // loading archivedRoutes
    mapSheetSuggestions: Tag[]
}>{
    // selected map sheets
    private pendingMapSheets: string[] = []; // changed mapSheets before being saved

    // routes
    private pendingRoutesLatLngs: Array<Array<[number, number]>> = [];  // changed routes before being saved

    private memoizedGetArchivedRoutes = memoizeOne((loadArchivedRoutes: boolean) => {
        if (loadArchivedRoutes) {
            this.setState({ busy: true }, async () => {
                this.props.getArchivedRoutes(false, false)
                    .then((archivedRoutes: IArchivedRoute[]) => {
                        const archivedRouteSuggestions = archivedRoutes.map((archivedRoute: IArchivedRoute) => {
                            return { id: archivedRoute.id.toString(), text: archivedRoute.title };
                        });
                        this.setState({archivedRoutes, archivedRouteSuggestions, busy: false});
                    });
            });
        }
    });

    constructor(props:any) {
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
                return { id: nz50Map.sheetCode, text: nz50Map.sheetCode + ' ' + nz50Map.name };
            })
        };
    }

    public componentDidMount() {
        if (this.state.mapVisible) {
            this.setUpMap();
        }
    }

   public render(){

        this.memoizedGetArchivedRoutes(!(this.props.readOnly ?? true));
        
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
        const handleMapDelete = (pos: number) => {
            this.deleteSelectedMaps(pos);
        } 
        const handleMapAddition = (tag: Tag) => {
            this.addSelectedMaps([tag.id]);
        }
        const handleMapDrag = (tag: Tag, currPos: number, newPos: number) => {
            this.dragSelectedMaps(tag, currPos, newPos);
        } 

        const onResize = (e: React.SyntheticEvent, data: ResizeCallbackData) => {
            this.resizeMap(data.size.height, data.size.width);
        }

        // changed in TripMap - save immediate
        const handleArchivedRouteDelete = () => null;
        const handleArchivedRouteAddition = (tag: Tag) => {
            this.selectArchivedRoute(parseInt(tag.id, 10));
        }
        const onClearRoute = () => this.clearRoute();

        return (
            <div>
                <Row>
                    <Col>
                        <ControlWrapper id={this.props.mapsId} field={this.props.mapsId} label={this.props.mapsLabel} hidden={this.props.hidden} isLoading={this.props.isLoading} onGetValidationMessage={this.props.onGetValidationMessage} saving={this.state.savingMapSheets} >
                        {
                            this.mapSheets.length === 0 &&
                                <FormText color="muted">No maps selected</FormText>
                        }
                        { ((this.props.readOnly && this.mapSheets.length > 0) || !this.props.readOnly) &&
                            <ButtonGroup>
                                <ReactTags tags={this.getTags()}
                                    autofocus={false}
                                    suggestions={this.state.mapSheetSuggestions}
                                    handleDelete={handleMapDelete}
                                    handleAddition={handleMapAddition}
                                    handleDrag={handleMapDrag}
                                    delimiters={delimiters}
                                    placeholder={'Start typing to add a map sheet by name'}
                                    readOnly={this.props.readOnly} />
                                { !this.props.readOnly &&
                                    <a href="https://ctc.org.nz/index.php/trip-signup-system-trip-leaders-guide" target="_blank">
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
                        <ControlWrapper id={this.props.routesId} field={this.props.routesId} label={this.props.routesLabel} hidden={this.props.hidden} isLoading={this.props.isLoading} onGetValidationMessage={this.props.onGetValidationMessage} saving={this.state.savingRoutes} >
                        { !this.state.mapVisible &&
                            <FormText color="muted">No routes specified</FormText>
                        }
                        { this.state.mapVisible &&
                            <ResizableBox width={this.initialWidth} height={this.initialHeight} minConstraints={[200, 200]} onResize={onResize}>
                                <div id="tripmap"/>
                            </ResizableBox>
                        }
                        { !this.props.readOnly &&
                                <ButtonGroup>
                                    <ReactTags tags={[]}
                                        autofocus={false}
                                        suggestions={this.state.archivedRouteSuggestions}
                                        handleDelete={handleArchivedRouteDelete}
                                        handleAddition={handleArchivedRouteAddition}
                                        delimiters={delimiters}
                                        placeholder={'Start typing to add a route from the archives by name'} />
                                    <ButtonWithConfirm id="ClearRoutesButton" color='secondary'
                                        onClick={onClearRoute} disabled={!this.state.mapVisible}  
                                        placement="top" tooltipText="Clear routes"
                                        confirmText="Confirm clear routes">
                                            <MdClear/>
                                    </ButtonWithConfirm>
                                    <a href="https://ctc.org.nz/index.php/trip-signup-system-trip-leaders-guide" target="_blank">
                                        <MdInfo size="36" color="#6899e4" style={{padding: '7px'}}/>
                                    </a>
                                </ButtonGroup>
                        }
                        </ControlWrapper>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        { !this.props.readOnly &&
                            <Row>
                                <Button onClick={onEdit}>
                                    <span className='fa fa-map'/>
                                    Edit Maps/Routes (Advanced)
                                </Button>
                                <a href="https://ctc.org.nz/index.php/trip-signup-system-trip-leaders-guide" target="_blank">
                                        <MdInfo size="36" color="#6899e4" style={{padding: '7px'}}/>
                                    </a>
                            </Row>
                        }
                        <Modal isOpen={this.state.editing} toggle={onSave} 
                            size="lg" style={{maxWidth: '1600px', width: '95%', margin: '10px auto'}} centered={true}>
                            <ModalHeader toggle={onSave}>Edit Routes/Maps</ModalHeader>
                            <ModalBody>
                                <MapEditor 
                                    nz50MapsBySheet={this.props.nz50MapsBySheet} 
                                    mapSheets={this.mapSheets} 
                                    routesAsLatLngs={this.getRoutesAsLatLngs()}
                                    onMapSheetsChanged={onMapSheetsChanged} 
                                    onRoutesChanged={onRoutesChanged}
                                    getArchivedRoutes={this.props.getArchivedRoutes}
                                    getArchivedRoute={this.props.getArchivedRoute}
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

    // -----------------

    private selectArchivedRoute(archivedRouteId: number) : void {
        this.setState({ busy: true });
         this.props.getArchivedRoute(archivedRouteId)
             .then(async (archivedRoute: IArchivedRoute) => {
                 this.saveSelectedRoute(archivedRoute.routes);
             })
            .finally(() => {
                this.setState({ busy: false });
            });
    }
    
    private clearRoute() : void {
        this.saveSelectedRoute([]);
    }

    private saveSelectedRoute(routesAsLatLngs: Array<Array<[number, number]>>): void {
        this.Save(null, routesAsLatLngs);
    }

    // -----------------

    private getTags(): Tag[] {
        if (!this.mapSheets) {
            return [];
        }
        return this.mapSheets.map((mapSheet: string) => 
            ({ id: mapSheet, text: this.mapSheetWithName(mapSheet) }));
    }

    private addSelectedMaps(addedMapSheets: string[]): void {
        this.saveSelectedMaps(this.addSelectedMapsWithoutSave(addedMapSheets));
    }

    private addSelectedMapsWithoutSave(addedMapSheets: string[]): string[] {
        const newMapSheets = this.mapSheets.concat(addedMapSheets);
        return newMapSheets;
    }

    private deleteSelectedMaps(pos: number): void {
        const tag: Tag = this.getTags()[pos];
        if (tag) {
            const newMapSheets = this.mapSheets.filter((mapSheet: string) => mapSheet !== tag.id);
            this.saveSelectedMaps(newMapSheets);
        }
    }
 
    private dragSelectedMaps(tag: Tag, currPos: number, newPos: number): void {
        const tags = [...this.getTags()];
        const newTags = tags.slice();
        newTags.splice(currPos, 1);
        newTags.splice(newPos, 0, tag);
        const newMapSheets = newTags.map(newTag => newTag.id);
        this.saveSelectedMaps(newMapSheets);
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
                    .filter(mapSheet => mapSheet > "")
                    .map(mapSheet => mapSheet + " " +  this.props.nz50MapsBySheet[mapSheet].name)));
            }

            return Promise.all(promises)
                .then(() => Promise.resolve(), () => Promise.resolve())
                .then(() => this.setState({savingMapSheets: false, savingRoutes: false}));
        }); 
    }

}