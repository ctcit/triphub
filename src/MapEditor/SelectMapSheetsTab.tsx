import * as L from 'leaflet';
import 'src/leaflet-editable/leaflet-editable.js';
import 'leaflet-gpx';
import * as React from 'react';
import Col from 'reactstrap/lib/Col';
import { TabPane, ButtonGroup, Row, FormText } from 'reactstrap';
import { IMap } from '../Interfaces';
import { Tag, WithContext as ReactTags } from 'react-tag-input';
import { MdClear, MdGridOff, MdZoomOutMap} from 'react-icons/md';
import { NZ50MapPolygon } from '../MapCommon';
import { ButtonWithTooltip } from '../ButtonWithTooltip';
import { Component } from 'react';
import { MapComponent } from './MapComponent';

const KeyCodes = {
    comma: 188,
    enter: 13,
  };
   
const delimiters = [KeyCodes.comma, KeyCodes.enter];

export class SelectMapSheetsTab extends Component<{
    isActiveTab: boolean,
    mapComponent: MapComponent | undefined,
    nz50MapsBySheet: { [mapSheet: string] : IMap },
    mapSheets: string[],
    routesAsLatLngs: Array<Array<[number, number]>>,
    saveMapsheetsChange: (mapSheets: string[]) => Promise<void>
},{
    activated: boolean,
    mapSheetSuggestions: Tag[],
    busy: boolean
}>{
    private mapIsSetup: boolean = false;

    constructor(props:any) {
        super(props);

        this.state = { 
            activated: false,
            mapSheetSuggestions: Object.keys(this.props.nz50MapsBySheet).map((mapSheet: string) => {
                const nz50Map: IMap = this.props.nz50MapsBySheet[mapSheet];
                return { id: nz50Map.sheetCode, text: nz50Map.sheetCode + ' ' + nz50Map.name };
            }),

            busy: false
        };
    }

    public render(){
        if (this.props.mapComponent && !this.mapIsSetup) {
            this.setUpMap();
            this.mapIsSetup = true;
        }
        if (this.mapIsSetup) {
            if (this.props.isActiveTab && !this.state.activated) {
                this.highlightSelectedMaps();
                this.setState({activated: true});
            } else if (!this.props.isActiveTab && this.state.activated) {
                this.unhighlightSelectedMaps();
                this.setState({activated: false});
            }
        }

        const handleMapDelete = (pos: number) => this.deleteSelectedMaps(pos);
        const handleMapAddition = (tag: Tag) => this.addSelectedMaps([tag.id]);
        const handleMapDrag = (tag: Tag, currPos: number, newPos: number) => this.dragSelectedMaps(tag, currPos, newPos);

        const selectRouteMaps = () => this.selectRouteMaps();
        const clearSelectedMaps = () => this.clearSelectedMaps();

        const zoomToRoutes = () => {
            this.props.mapComponent?.fitBounds();
        }
        
        return (
            <TabPane tabId="SelectMaps">
                <Row className="mb-2 ml-1"><FormText color='muted'>Click on map sheet to select; click again to unselect</FormText></Row>
                <Row className="mb-2">
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
                            <ButtonWithTooltip id="ClearSelectedMapsButton" color='secondary' 
                                onClick={clearSelectedMaps} disabled={false} 
                                placement="top" tooltipText="Clear all selected maps">
                                    <MdClear/>
                            </ButtonWithTooltip>
                        </ButtonGroup>
                    </Col>
                    <Col sm={6}>
                        <ReactTags tags={this.getTags()}
                            suggestions={this.state.mapSheetSuggestions}
                            handleDelete={handleMapDelete}
                            handleAddition={handleMapAddition}
                            handleDrag={handleMapDrag}
                            delimiters={delimiters}
                            placeholder={'Start typing to add a map sheet by name'} />
                    </Col>
                </Row>
            </TabPane>
        );
    }

    protected setUpMap(): void {
        (this.props.mapComponent as MapComponent).setRoutesFromLatLngs(this.props.routesAsLatLngs);

        (this.props.mapComponent as MapComponent).fitBounds();

        Object.keys(this.props.nz50MapsBySheet).map((mapSheet: string) => {
            const nz50Map: IMap = this.props.nz50MapsBySheet[mapSheet];
            const polygon = (this.props.mapComponent as MapComponent).nz50MapPolygonsBySheet[nz50Map.sheetCode];

            // add click event handler for polygon
            (polygon as any).nz50map = nz50Map;
            polygon.on('click', event => {
                this.selectOrUnselectMap(event.target);
            });

        });

        this.showInitiallySelectedMaps();
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
        const tag: Tag = this.getTags()[pos];
        if (tag) {
            this.unhighlightMapSheet(tag.id);
            const newMapSheets = this.props.mapSheets.filter((mapSheet: string) => mapSheet !== tag.id);
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

    private getTags(): Tag[] {
        return this.props.mapSheets.map((mapSheet: string) => 
            ({ id: mapSheet, text: (this.props.mapComponent as MapComponent).mapSheetWithName(mapSheet) }));
    }

}

