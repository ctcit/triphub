import 'src/leaflet-editable/leaflet-editable.js';
import 'leaflet-gpx';
import * as React from 'react';
import { MapCommon } from 'src/MapCommon';
import { ResizableBox, ResizeCallbackData } from 'react-resizable';

export class MapComponent extends MapCommon<{
    leafletMapId: string,
    setMapComponent: (mapComponent: MapComponent) => void,
    showMap: boolean,
    maxMapWidth: number
},{
}>{
    private mapIsSetUp: boolean = false
    constructor(props:any) {
        super(props);
    }

    public componentDidMount() {
        this.setUpMap();
    }

    public componentDidUpdate() {
        if (this.map && this.props.showMap && !this.mapIsSetUp) {
            this.resizeMap(500, this.props.maxMapWidth);
            this.fitBounds();
            this.fitBounds(); // HACK - not sure why but first fitbounds() is not enough!
            this.mapIsSetUp = true;
        }
    }

    public render() {

        const onResizeMap = (e: React.SyntheticEvent, data: ResizeCallbackData) => {
            this.resizeMap(data.size.height, data.size.width);
        }

        return (
            <div hidden={!this.props.showMap}> 
                <ResizableBox key="resizableMap" 
                    className="resizableMap" 
                    width={this.props.maxMapWidth} 
                    height={500} 
                    axis={'y'} 
                    minConstraints={[300, 300]} 
                    maxConstraints={[2000, 2000]} 
                    onResize={onResizeMap}
                    >
                    <div id={this.props.leafletMapId}/>
                </ResizableBox>
            </div>
        );
    }

    public setUpMap(): void {
        super.setUpMap();

        this.props.setMapComponent(this);
    }

}

