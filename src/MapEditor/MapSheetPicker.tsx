import 'src/leaflet-editable/leaflet-editable.js';
import 'leaflet-gpx';
import { TabContent, FormGroup } from 'reactstrap';
import ReactResizeDetector from 'react-resize-detector';
import { SelectMapSheetsTab } from './SelectMapSheetsTab';
import { Component } from 'react';
import { MapComponent } from './MapComponent';

export class MapSheetPicker extends Component<{
    mapSheets: string[],
    onMapSheetsChanged: (mapSheets: string[]) => void,
}, {
    activeTab: string,
    showMap: boolean,
    maxMapWidth: number,
    mapComponent: MapComponent | undefined,
    mapSheets: string[]
}>{

    constructor(props: any) {
        super(props);

        this.state = {
            activeTab: "SelectMaps",
            showMap: true,
            maxMapWidth: 1200,
            mapComponent: undefined,

            mapSheets: this.props.mapSheets,
        };
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

        const setMapComponent = (mapComponent: MapComponent): void => {
            this.setState({ mapComponent });
        }

        const saveMapsheetsChange = async (mapSheets: string[]) => {
            await this.saveMapsheetsChange(mapSheets);
        }

        return (
            <FormGroup>
                <ReactResizeDetector handleWidth={true} handleHeight={false} onResize={onResizeModal} />
                {/* <Nav tabs={true}>
                    <NavItem>
                        <NavLink
                            className={classnames({ active: this.state.activeTab === 'SelectMaps' })}>
                            Select Map Sheets
                        </NavLink>
                    </NavItem>
                </Nav> */}
                <TabContent activeTab={this.state.activeTab}>
                    <SelectMapSheetsTab
                        isActiveTab={this.state.activeTab === "SelectMaps"}
                        mapComponent={this.state.mapComponent}
                        mapSheets={this.state.mapSheets}
                        routesAsLatLngs={[]}
                        saveMapsheetsChange={saveMapsheetsChange}
                    />
                </TabContent>
                <MapComponent
                    leafletMapId='mappickermap'
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


    private async setStateAsync(newState: any): Promise<void> {
        return new Promise((resolve) => {
            this.setState(newState, () => { resolve(); });
        })
    }

}

