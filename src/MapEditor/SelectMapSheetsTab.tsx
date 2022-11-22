import * as L from 'leaflet';
import 'src/leaflet-editable/leaflet-editable.js';
import 'leaflet-gpx';
import { TabPane, ButtonGroup, Row, FormText, Col } from 'reactstrap';
import { IMap } from '../Interfaces';
import { MdInfo, MdClear, MdGridOff, MdZoomOutMap} from 'react-icons/md';
import { NZ50MapPolygon } from '../MapCommon';
import { ButtonWithTooltip } from '../ButtonWithTooltip';
import { Component } from 'react';
import { MapComponent } from './MapComponent';
import memoizeOne from 'memoize-one';
import Select, { ActionMeta } from 'react-select'
import { MapsService } from 'src/Services/MapsService';

export class SelectMapSheetsTab extends Component<{
    isActiveTab: boolean,
    mapComponent: MapComponent | undefined,
    mapSheets: string[],
    routesAsLatLngs: Array<Array<[number, number]>>,
    saveMapsheetsChange: (mapSheets: string[]) => Promise<void>
},{
    activated: boolean,
    mapSheetSuggestions: { value: any, label: string }[],
    busy: boolean
}>{
    private mapIsSetup: boolean = false;

    private memoizedSetUpMap = memoizeOne((mapComponent: MapComponent | undefined) => {
        if (mapComponent && !this.mapIsSetup) {
            this.setUpMap();
            this.mapIsSetup = true;
        }
    });

    private memoizedHighlightOrUnhighlightSelectedMaps = memoizeOne((mapIsSetup: boolean, isActiveTab: boolean) => {
        if (this.mapIsSetup) {
            if (this.props.isActiveTab && !this.state.activated) {
                this.setMapSheetsEventsOn();
                this.highlightSelectedMaps();
                this.setState({activated: true});
            } else if (!this.props.isActiveTab && this.state.activated) {
                this.setMapSheetsEventsOff();
                this.unhighlightSelectedMaps();
                this.setState({activated: false});
            }
        }
    });

    constructor(props:any) {
        super(props);

        this.state = { 
            activated: false,
            mapSheetSuggestions: Object.keys(MapsService.MapsBySheet).map((mapSheet: string) => {
                const nz50Map: IMap = MapsService.MapsBySheet[mapSheet];
                return { value: nz50Map.sheetCode, label: nz50Map.sheetCode + ' ' + nz50Map.name };
            }),

            busy: false
        };
    }

    public render(){
        this.memoizedSetUpMap(this.props.mapComponent);
        this.memoizedHighlightOrUnhighlightSelectedMaps(this.mapIsSetup, this.props.isActiveTab);

        const onChange = (newMapsValue: any, actionMeta: ActionMeta<any>) => {
            if (actionMeta.action === 'select-option') {
                const addedMapSheets = newMapsValue
                    .map((m: {value: string, label: string}) => m.value)
                    .filter((id: string) => !this.props.mapSheets.includes(id))
                this.addSelectedMaps(addedMapSheets);
            } else if (actionMeta.action === 'remove-value') {
                const newSelectedMapSheets = newMapsValue.map((m: {value: string, label: string}) => m.value)
                const deleteMapPos = this.props.mapSheets
                    .findIndex((oldSelectMapSheet: string) => !newSelectedMapSheets.includes(oldSelectMapSheet))
                this.deleteSelectedMaps(deleteMapPos)
            } else if (actionMeta.action === 'clear') {
                this.clearSelectedMaps();
            }
        }
        const selectRouteMaps = () => this.selectRouteMaps();
        const clearSelectedMaps = () => this.clearSelectedMaps();

        const zoomToRoutes = () => {
            this.props.mapComponent?.fitBounds();
        }
        
        return (
            <TabPane tabId="SelectMaps">
                <Row className="mb-2 ml-1">
                    <FormText color='muted'>Click on map sheet to select; click again to unselect</FormText>
                    <a href="https://youtu.be/kpxAIiyTWHs" target="_blank">
                        <MdInfo size="30" color="#6899e4" style={{padding: '4px'}}/>
                    </a>
                </Row>
                <Row className="mb-2">
                    {this.props.routesAsLatLngs.length > 0 &&
                        <Col sm={2}>
                            <ButtonGroup>
                                <ButtonWithTooltip id="ZoomToRoutesButton1" color='secondary' 
                                    onClick={zoomToRoutes} disabled={!this.props.mapComponent || this.props.mapComponent.routes.length === 0} 
                                    placement="top" tooltipText="Zoom to route extents">
                                        <MdZoomOutMap/>
                                </ButtonWithTooltip>
                                <ButtonWithTooltip id="SelectMapsOverlappingRouteButton" color='secondary' 
                                    onClick={selectRouteMaps} disabled={!this.props.mapComponent || this.props.mapComponent.routes.length === 0 }  
                                    placement="top" tooltipText="Select maps overlapping the route">
                                        <MdGridOff/>
                                </ButtonWithTooltip>
                                {/* <ButtonWithTooltip id="ClearSelectedMapsButton" color='secondary' 
                                    onClick={clearSelectedMaps} disabled={false} 
                                    placement="top" tooltipText="Clear all selected maps">
                                        <MdClear/>
                                </ButtonWithTooltip> */}
                            </ButtonGroup>
                        </Col>
                    }
                    <Col sm={6}>
                       <Select
                            autoFocus={false}
                            value={this.getTags()}
                            isMulti={true}
                            isSearchable={true}
                            options={this.state.mapSheetSuggestions}
                            onChange={onChange}
                            delimiter=','
                            placeholder={'Start typing to add a map sheet by name'}
                            isDisabled={false}
                            styles={{ control: (provided: any, state: any) => ({
                                ...provided,
                                minWidth: '300px'
                                }), container: (provided: any, state: any) => ({
                                ...provided,
                                zIndex: '999'
                            })}}
                        />
                    </Col>
                </Row>
            </TabPane>
        );
    }

    protected setUpMap(): void {
        (this.props.mapComponent as MapComponent).setRoutesFromLatLngs(this.props.routesAsLatLngs);

        (this.props.mapComponent as MapComponent).fitBounds();

        // this.showInitiallySelectedMaps();
    }

    private setMapSheetsEventsOn() {
        Object.keys(MapsService.MapsBySheet).map((mapSheet: string) => {
            const nz50Map: IMap = MapsService.MapsBySheet[mapSheet];
            const polygon = (this.props.mapComponent as MapComponent).nz50MapPolygonsBySheet[nz50Map.sheetCode];

            // add click event handler for polygon
            (polygon as any).nz50map = nz50Map;
            polygon.on('click', event => {
                this.selectOrUnselectMap(event.target);
            });

        });

    }

    private setMapSheetsEventsOff() {
        Object.keys(MapsService.MapsBySheet).map((mapSheet: string) => {
            const nz50Map: IMap = MapsService.MapsBySheet[mapSheet];
            const polygon = (this.props.mapComponent as MapComponent).nz50MapPolygonsBySheet[nz50Map.sheetCode];

            // add click event handler for polygon
            (polygon as any).nz50map = nz50Map;
            polygon.off('click');
        });
    }

    // -------------------------------------------------------
    // Map selection
    // -------------------------------------------------------

    private showInitiallySelectedMaps(): void {
        const initialMapSheets = this.props.mapSheets;
        this.clearAllSelectedMapsWithoutSave();
        this.addSelectedMapsWithoutSave(initialMapSheets);
    }

    private clearSelectedMaps(): void {
        this.clearAllSelectedMaps();
    }

    private selectRouteMaps(): void {

        this.clearAllSelectedMaps();
        const mapPolygons = (this.props.mapComponent?.nz50LayerGroup.getLayers() as NZ50MapPolygon[]).filter((polygon) => {
            return polygon.nz50map;
        });
        const mapSheets: string[] = [];
        // crude, but good enough, overlap detection
        mapPolygons.forEach((polygon: NZ50MapPolygon) => {
            const mapSheet: string = polygon.nz50map.sheetCode;
            const polygonBounds = polygon.getBounds();
            const intersects = this.props.mapComponent?.routes.some((route: L.Polyline) => {
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
        const index = this.props.mapSheets.indexOf(mapSheet);
        if (index < 0) {
            this.addSelectedMaps([ mapSheet ]);
        } else {
            this.deleteSelectedMaps(index);
        }
    }

    private clearAllSelectedMaps(): void {
        this.saveSelectedMaps(this.clearAllSelectedMapsWithoutSave());
    }

    private clearAllSelectedMapsWithoutSave(): string[] {
        this.unhighlightMaps(this.props.mapSheets);
        return [];
    }

    private addSelectedMaps(addedMapSheets: string[]): void {
        this.saveSelectedMaps(this.addSelectedMapsWithoutSave(addedMapSheets));
    }

    private addSelectedMapsWithoutSave(addedMapSheets: string[]): string[] {
        this.highlightMaps(addedMapSheets);
        const newMapSheets = this.props.mapSheets.concat(addedMapSheets);
        return newMapSheets;
    }

    private deleteSelectedMaps(pos: number): void {
        const tag: { value: any, label: string } = this.getTags()[pos];
        if (tag) {
            this.unhighlightMapSheet(tag.value);
            const newMapSheets = this.props.mapSheets.filter((mapSheet: string) => mapSheet !== tag.value);
            this.saveSelectedMaps(newMapSheets);
        }
    }
 
    private async saveSelectedMaps(mapSheets: string[]): Promise<void> {
        await this.props.saveMapsheetsChange(mapSheets);
    }

    private highlightSelectedMaps(): void {
        this.highlightMaps(this.props.mapSheets);
    }

    private unhighlightSelectedMaps(): void {
        this.unhighlightMaps(this.props.mapSheets);
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
        const polygon: NZ50MapPolygon = (this.props.mapComponent as MapComponent).nz50MapPolygonsBySheet[mapSheet];
        if (polygon) {
            polygon.setStyle({ fillOpacity: 0.1});
        }
    }

    private unhighlightMapSheet(mapSheet: string): void {
        const polygon: NZ50MapPolygon = (this.props.mapComponent as MapComponent).nz50MapPolygonsBySheet[mapSheet];
        if (polygon) {
            polygon.setStyle({ fillOpacity: 0.0});
        }
    }

    private getTags(): { value: any, label: string }[] {
        if (!this.props.mapComponent) {
            return [];
        }
        return this.props.mapSheets.map((mapSheet: string) => 
            ({ value: mapSheet, label: (this.props.mapComponent as MapComponent).mapSheetWithName(mapSheet) }));
    }

}

