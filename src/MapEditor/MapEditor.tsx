import 'src/leaflet-editable/leaflet-editable.js';
import 'leaflet-gpx';
import { TabContent, Nav, NavItem, NavLink, FormGroup } from 'reactstrap';
import classnames from 'classnames';
import ReactResizeDetector from 'react-resize-detector';
import { RoutesArchiveTab } from './RoutesArchiveTab';
import { SelectMapSheetsTab } from './SelectMapSheetsTab';
import { EditRoutesTab } from './EditRoutesTab';
import { Component } from 'react';
import { MapComponent } from './MapComponent';

export class MapEditor extends Component<{
    mapSheets: string[],
    routesAsLatLngs: Array<Array<[number, number]>>,
    onMapSheetsChanged: (mapSheets: string[]) => void,
    onRoutesChanged: (routesAsLatLngs: Array<Array<[number, number]>>) => void
}, {
    activeTab: string,
    showMap: boolean,
    maxMapWidth: number,
    mapComponent: MapComponent | undefined,
    mapSheets: string[]
    routesAsLatLngs: Array<Array<[number, number]>>,
    currentRouteIndex: number,
    canUndoLastRouteEdit: boolean
}>{
    // routes
    private routesUndoStack: Array<{ routesAsLatLngs: Array<Array<[number, number]>>, currentRouteIndex: number }> = [];

    constructor(props: any) {
        super(props);

        if (this.props.routesAsLatLngs.length === 0) {
            this.props.routesAsLatLngs.push([]);
        }

        this.state = {
            activeTab: "EditRoutes",
            showMap: true,
            maxMapWidth: 1200,
            mapComponent: undefined,

            mapSheets: this.props.mapSheets,
            routesAsLatLngs: this.props.routesAsLatLngs,
            currentRouteIndex: this.props.routesAsLatLngs.length - 1,
            canUndoLastRouteEdit: false
        };
    }

    public async componentDidMount() {
        await this.saveRouteChange(this.props.routesAsLatLngs, this.props.routesAsLatLngs.length - 1);
    }

    public render() {
        
        const onResizeModal = (width?: number, height?: number) => {
            // event fired by ReactResizeDetector
            // limit the resizable maximum width for the map when the modal width changes
            if (width) {
                this.setState({maxMapWidth: width});
                // resize the ResizableBox containing the map
                const layerControl: HTMLStyleElement = document.getElementsByClassName('resizableMap')[0] as HTMLStyleElement;
                layerControl.style.width = Math.floor(width).toString() + 'px';
                // resize the map
                this.state.mapComponent?.resizeMap(undefined, width);
            }
        }

        const setEditRoutesTab = () => {
            setTab('EditRoutes', true);
        }
        const setRoutesArchiveTab = () => {
            setTab('RoutesArchive', true);
        }
        const setSelectMapsTab = () => {
            setTab('SelectMaps', true);
        }
        const setTab = (tab: string, showMap: boolean) => {
            if (this.state.activeTab !== tab) {
                this.setState({ activeTab: tab, showMap });
            }
        }

        const setMapComponent = (mapComponent: MapComponent): void => {
            this.setState({ mapComponent });
        }

        const saveMapsheetsChange = async (mapSheets: string[]) => {
            await this.saveMapsheetsChange(mapSheets);
        }
        const saveRouteChange = async (routesAsLatLngs?: Array<Array<[number, number]>>, currentRouteIndex?: number) => {
            await this.saveRouteChange(routesAsLatLngs, currentRouteIndex);
        }
        const undoLastRouteEdit = async () => {
            return await this.undoLastRouteEdit();
        }

        return (
            <FormGroup>
                <ReactResizeDetector handleWidth={true} handleHeight={false} onResize={onResizeModal} />
                <Nav tabs={true}>
                    <NavItem>
                        <NavLink
                            className={classnames({ active: this.state.activeTab === 'EditRoutes' })}
                            onClick={setEditRoutesTab}>
                            Edit Routes
                        </NavLink>
                    </NavItem>
                    <NavItem>
                        <NavLink
                            className={classnames({ active: this.state.activeTab === 'RoutesArchive' })}
                            onClick={setRoutesArchiveTab}>
                            Routes Archive
                        </NavLink>
                    </NavItem>
                    <NavItem>
                        <NavLink
                            className={classnames({ active: this.state.activeTab === 'SelectMaps' })}
                            onClick={setSelectMapsTab}>
                            Select Map Sheets
                        </NavLink>
                    </NavItem>
                </Nav>
                <TabContent activeTab={this.state.activeTab}>
                    <EditRoutesTab
                        isActiveTab={this.state.activeTab === "EditRoutes"}
                        mapComponent={this.state.mapComponent}
                        routesAsLatLngs={this.props.routesAsLatLngs}
                        currentRouteIndex={this.state.currentRouteIndex}
                        canUndoLastRouteEdit={this.state.canUndoLastRouteEdit}
                        saveRouteChange={saveRouteChange}
                        undoLastRouteEdit={undoLastRouteEdit}
                    />
                    <RoutesArchiveTab
                        isActiveTab={this.state.activeTab === "RoutesArchive"}
                        mapComponent={this.state.mapComponent}
                        routesAsLatLngs={this.props.routesAsLatLngs}
                        currentRouteIndex={this.state.currentRouteIndex}
                        canUndoLastRouteEdit={this.state.canUndoLastRouteEdit}
                        saveRouteChange={saveRouteChange}
                        undoLastRouteEdit={undoLastRouteEdit}
                    />
                    <SelectMapSheetsTab
                        isActiveTab={this.state.activeTab === "SelectMaps"}
                        mapComponent={this.state.mapComponent}
                        mapSheets={this.state.mapSheets}
                        routesAsLatLngs={this.props.routesAsLatLngs}
                        saveMapsheetsChange={saveMapsheetsChange}
                    />
                </TabContent>
                <MapComponent
                    leafletMapId='mapeditormap'
                    setMapComponent={setMapComponent}
                    showMap={this.state.showMap}
                    maxMapWidth={this.state.maxMapWidth}
                />
            </FormGroup>
        );
    }

    // -------------------------------------------------------
    // Mapsheets
    // -------------------------------------------------------

    private async saveMapsheetsChange(mapSheets: string[]): Promise<void> {
        await this.setStateAsync({ mapSheets });
        this.props.onMapSheetsChanged(mapSheets);
    }

    // -------------------------------------------------------
    // Route undo
    // -------------------------------------------------------

    private async saveRouteChange(routesAsLatLngs?: Array<Array<[number, number]>>, currentRouteIndex?: number): Promise<void> {
        await this.setStateAsync({ routesAsLatLngs, currentRouteIndex });
        await this.recordLastRouteEdit();
        if (routesAsLatLngs) {
            await this.props.onRoutesChanged(routesAsLatLngs);
        }
    }

    private async recordLastRouteEdit(): Promise<void> {
        this.routesUndoStack.push({ routesAsLatLngs: this.state.routesAsLatLngs, currentRouteIndex: this.state.currentRouteIndex });
        // console.log(">>>>> " + this.routesUndoStack.length + ", " + routesAsLatLngs);
        await this.setStateAsync({ canUndoLastRouteEdit: this.routesUndoStack.length > 1 });
    }

    private async undoLastRouteEdit(): Promise<[Array<Array<[number, number]>>, number, boolean]> {
        let routesAsLatLngs: Array<Array<[number, number]>> = [];
        let currentRouteIndex: number = -1;
        let canUndoLastRouteEdit: boolean = false;
        if (this.routesUndoStack.length > 1) { // always leave the orignal on the stack
            await this.setStateAsync({ busy: true });
            if (this.routesUndoStack.length > 1) { // always leave the orignal on the stack
                let undoStackItem = this.routesUndoStack.pop(); // discard this
                undoStackItem = this.routesUndoStack[this.routesUndoStack.length - 1]; // restore to this
                routesAsLatLngs = undoStackItem.routesAsLatLngs;
                currentRouteIndex = undoStackItem?.currentRouteIndex ?? -1;
                canUndoLastRouteEdit = this.routesUndoStack.length > 1;
                // console.log("<<<< " + this.routesUndoStack.length + ", " + routesAsLatLngs);
                await this.setStateAsync({ routesAsLatLngs, currentRouteIndex, canUndoLastRouteEdit });
                this.props.onRoutesChanged(routesAsLatLngs);
            }
        }
        return [routesAsLatLngs, currentRouteIndex, canUndoLastRouteEdit];
    }

    private async setStateAsync(newState: any): Promise<void> {
        return new Promise((resolve) => {
            this.setState(newState, () => { resolve(); });
        })
    }

}

