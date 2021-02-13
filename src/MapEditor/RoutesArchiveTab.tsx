import * as L from 'leaflet';
import 'src/leaflet-editable/leaflet-editable.js';
import 'leaflet-gpx';
import * as React from 'react';
import Col from 'reactstrap/lib/Col';
import { Button, TabPane, ButtonGroup, Row, FormText } from 'reactstrap';
import { IArchivedRoute, IMap } from '../Interfaces';
import { Tag, WithContext as ReactTags } from 'react-tag-input';
import { MdUndo, MdZoomOutMap} from 'react-icons/md';
import { Spinner } from '../Widgets';
import { ArchivedRoutePolygon, MapCommon } from '../MapCommon';
import { ButtonWithTooltip } from '../ButtonWithTooltip';
import { Component } from 'react';
import { MapComponent } from './MapComponent';

const KeyCodes = {
    comma: 188,
    enter: 13,
  };
   
const delimiters = [KeyCodes.comma, KeyCodes.enter];

export class RoutesArchiveTab extends Component<{
    isActiveTab: boolean,
    mapComponent: MapComponent | undefined,
    nz50MapsBySheet: { [mapSheet: string] : IMap },
    archivedRoutesById: { [archivedRouteId: string] : IArchivedRoute },
    routesAsLatLngs: Array<Array<[number, number]>>,
    currentRouteIndex: number,
    canUndoLastRouteEdit: boolean,
    saveRouteChange: (routesAsLatLngs?: Array<Array<[number, number]>>, currentRouteIndex?: number) => Promise<void>,
    undoLastRouteEdit: () => Promise<void>,
    getArchivedRoute: (routeId: string) => Promise<IArchivedRoute | undefined> // TODO - replace with service
},{
    activated: boolean,
    archivedRouteSuggestions: Tag[],
    busy: boolean
}>{
    protected archivedRoutesLayerGroup: L.LayerGroup<ArchivedRoutePolygon[]>;
    private mapIsSetup: boolean = false;
    private infoControl: L.Control;;


    constructor(props:any) {
        super(props);

        this.state = { 
            activated: false,
            archivedRouteSuggestions: Object.keys(this.props.archivedRoutesById).map((archivedRouteId: string) => {
                const archivedRoute: IArchivedRoute = this.props.archivedRoutesById[archivedRouteId];
                return { id: archivedRoute.id.toString(), text: archivedRoute.title };
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
                this.showArchivedRoutes();
                this.setState({activated: true});
            } else if (!this.props.isActiveTab && this.state.activated) {
                this.hideArchivedRoutes();
                this.setState({activated: false});
            }
        }

        const zoomToRoutes = () => {
            this.props.mapComponent?.fitBounds();
        }
        const undoLastRouteEdit2 = async () => {
            const mapComponent = (this.props.mapComponent as MapComponent);
            await this.props.undoLastRouteEdit();
            this.infoControl.addTo(mapComponent.map);
            this.setDefaultInfoControlMessage();
        }
        const handleArchivedRouteDelete = () => null;
        const handleArchivedRouteAddition = (tag: Tag) => {
            this.selectArchivedRoute(tag.id);
        }

        return (
            <TabPane tabId="RoutesArchive">
                <Row className="mb-2 ml-1"><FormText color='muted'>Import routes from the routes archive</FormText></Row>
                <Row className="mb-2">
                    <Col sm={2}>
                        <ButtonGroup>
                            <ButtonWithTooltip id="ZoomToRoutesButton3" color='secondary' 
                                onClick={zoomToRoutes} disabled={!this.props.mapComponent || this.props.mapComponent.routes.length === 0} 
                                placement="top" tooltipText="Zoom to route extents">
                                    <MdZoomOutMap/>
                            </ButtonWithTooltip>
                            <ButtonWithTooltip id="UndoButton2" color='secondary' 
                                onClick={undoLastRouteEdit2} disabled={!this.props.canUndoLastRouteEdit} 
                                placement="top" tooltipText="Undo last change">
                                    <MdUndo/>
                            </ButtonWithTooltip>
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
        )
    }

    public setUpMap(): void {
        const mapComponent = (this.props.mapComponent as MapComponent);
        mapComponent.setRoutesFromLatLngs(this.props.routesAsLatLngs);

        mapComponent.fitBounds();

        this.infoControl = (L as any).control();
        const infoControl: any = this.infoControl;
        infoControl.onAdd = () => {
            infoControl._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
            return infoControl._div;
        };
        infoControl.update = (html: string) => {
            infoControl._div.innerHTML = html;
        };

        this.showArchivedRoutes();
    }

    // -------------------------------------------------------
    // Routes Archive
    // -------------------------------------------------------

    private showArchivedRoutes(): void {
        const mapComponent = (this.props.mapComponent as MapComponent);
        const infoControl: any = this.infoControl;

        if (!this.archivedRoutesLayerGroup) {
            this.archivedRoutesLayerGroup = L.layerGroup()
                .addTo(mapComponent.map);
            this.infoControl
                .addTo(mapComponent.map);
    
            // -----
            const polylineOptions: any = {color: 'green', weight: 5, opacity: 0.4};
            Object.keys(this.props.archivedRoutesById).map((id: string) => {
                const archivedRoute: IArchivedRoute = this.props.archivedRoutesById[id];
                if (archivedRoute.summarizedRoutes) {
                    const routesLatLngsArray: L.LatLng[][] = archivedRoute.summarizedRoutes.map((route: number[][]) => 
                        route.map((point: number[]) => new L.LatLng(point[0], point[1])));
                    // the route summary polylines
                    const polylines = routesLatLngsArray.map((routeLatLngs: L.LatLng[]) => 
                        L.polyline(routeLatLngs, polylineOptions).addTo(this.archivedRoutesLayerGroup)
                    );
                    polylines.forEach(polyline => {
                        // add click event handler for polyline
                        (polyline as any).archivedRoute = archivedRoute;
                        polyline.on('click', () => {
                            this.selectArchivedRoute(archivedRoute.id);
                        });

                        polyline.on('mouseover', () => {
                            polylines.forEach(p => { p.setStyle({weight: 10, opacity: 0.7})} );
                            infoControl.update('<b>' + archivedRoute.title + '</b><br /><p>' + archivedRoute.description + '</p>');
                        });
                        polyline.on('mouseout', () => {
                            polylines.forEach(p => { p.setStyle(polylineOptions)} );
                            this.setDefaultInfoControlMessage();
                        });
                    });
                }
            });
        } else {
            this.archivedRoutesLayerGroup
                .addTo(mapComponent.map);
            this.infoControl
                .addTo(mapComponent.map);
        }

        this.setDefaultInfoControlMessage();
    }

    private hideArchivedRoutes(): void {
        const mapComponent = (this.props.mapComponent as MapComponent);
        if (this.archivedRoutesLayerGroup) {
            this.archivedRoutesLayerGroup
                .removeFrom(mapComponent.map);
            this.infoControl
                .remove();
        }
    }
    
    private selectArchivedRoute(archivedRouteId: string) {
        const mapComponent = (this.props.mapComponent as MapComponent);
        this.props.getArchivedRoute(archivedRouteId)
            .then((archivedRoute: IArchivedRoute) => {
                mapComponent.importGpx(archivedRoute.gpx);
            });

    }

    private setDefaultInfoControlMessage(): void {
        const infoControl: any = this.infoControl;
        const defaultInfoControlMessage: string = 'Hover over a route for details.  Click to import.';
        infoControl.update(defaultInfoControlMessage);
    }

    // private updateArchivedRouteSummary() {
    //     this.setState({ busy: true });

    //     Object.keys(this.props.archivedRoutesById).map((archivedRouteId: string) => {
    //         this.props.getArchivedRoute(archivedRouteId)
    //             .then((archivedRoute: IArchivedRoute) => {
    //                 const gpxLatLngsArray: Array<Array<[number, number]>> = [];
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

