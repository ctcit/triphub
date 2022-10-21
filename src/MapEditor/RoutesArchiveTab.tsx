import * as L from 'leaflet';
import 'src/leaflet-editable/leaflet-editable.js';
import 'leaflet-gpx';
import { Button, TabPane, ButtonGroup, Row, FormText, Col } from 'reactstrap';
import { IArchivedRoute, IMap } from '../Interfaces';
import { MdInfo, MdUndo, MdZoomOutMap} from 'react-icons/md';
import { Spinner } from '../Widgets';
import { ArchivedRoutePolygon } from '../MapCommon';
import { ButtonWithTooltip } from '../ButtonWithTooltip';
import { Component } from 'react';
import { MapComponent } from './MapComponent';
import memoizeOne from 'memoize-one';
import Select, { ActionMeta } from 'react-select'

export class RoutesArchiveTab extends Component<{
    isActiveTab: boolean,
    mapComponent: MapComponent | undefined,
    nz50MapsBySheet: { [mapSheet: string] : IMap },
    routesAsLatLngs: Array<Array<[number, number]>>,
    currentRouteIndex: number,
    canUndoLastRouteEdit: boolean,
    saveRouteChange: (routesAsLatLngs?: Array<Array<[number, number]>>, currentRouteIndex?: number) => Promise<void>,
    undoLastRouteEdit: () => Promise<[Array<Array<[number, number]>>, number, boolean]>, 
    getArchivedRoutes: (includeHidden: boolean, force: boolean) => Promise<IArchivedRoute[]>,
    getArchivedRoute: (routeId: number) => Promise<IArchivedRoute | undefined> // TODO - replace with service
},{
    archivedRoutes: IArchivedRoute[],
    archivedRouteSuggestions: { value: any, label: string }[],
    busy: boolean
}>{
    protected archivedRoutesLayerGroup: L.LayerGroup<ArchivedRoutePolygon[]> = L.layerGroup();
    private mapIsSetup: boolean = false;
    private infoControl: L.Control = new L.Control();

    private memoizedGetArchivedRoutes = memoizeOne((includeHidden: boolean, force: boolean, isActiveTab: boolean) => {
        if (isActiveTab) {
            this.props.getArchivedRoutes(includeHidden, force)
            .then((archivedRoutes: IArchivedRoute[]) => {
                const archivedRouteSuggestions = archivedRoutes.map((archivedRoute: IArchivedRoute) => {
                    return { value: archivedRoute.id, label: archivedRoute.title };
                });
                this.setState({archivedRoutes, archivedRouteSuggestions, busy: false});
            });
        }
    });

    private memoizedSetUpMap = memoizeOne((mapComponent: MapComponent | undefined) => {
        if (mapComponent && !this.mapIsSetup) {
            this.setUpMap();
            this.mapIsSetup = true;
        }
    });

    private memoizedShowOrHideArchivedRoutes = memoizeOne((isActiveTab: boolean, archivedRoutes: IArchivedRoute[]) => {
        if (this.mapIsSetup) {
            if (isActiveTab) {
                this.showArchivedRoutes();
           } else if (!isActiveTab) {
                this.hideArchivedRoutes();
            }
        }
    });

    constructor(props:any) {
        super(props);

        this.state = { 
            archivedRoutes: [],
            archivedRouteSuggestions: [],
            busy: true
        };
    }

    public render() {

        this.memoizedGetArchivedRoutes(false, false, this.props.isActiveTab);
        this.memoizedSetUpMap(this.props.mapComponent);
        this.memoizedShowOrHideArchivedRoutes(this.props.isActiveTab, this.state.archivedRoutes);

        const zoomToRoutes = () => {
            this.props.mapComponent?.fitBounds();
        }
        const undoLastRouteEdit2 = async () => {
            const mapComponent = (this.props.mapComponent as MapComponent);
            await this.undoLastRouteEdit();
            this.infoControl.addTo(mapComponent.map);
            this.setDefaultInfoControlMessage();
        }
        const onArchivedRouteChange = (newRouteValue: any, actionMeta: ActionMeta<any>) => {
            this.selectArchivedRoute(newRouteValue.value);
        }

        return (
            <TabPane tabId="RoutesArchive">
                <Row className="mb-2 ml-1">
                    <FormText color='muted'>Import routes from the routes archive</FormText>
                    <a href="https://youtu.be/NxxHF-H0I7A" target="_blank">
                        <MdInfo size="30" color="#6899e4" style={{padding: '4px'}}/>
                    </a>
                </Row>
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
                        <Select
                            autoFocus={false}
                            isMulti={false}
                            isSearchable={true}
                            options={this.state.archivedRouteSuggestions}
                            onChange={onArchivedRouteChange}
                            delimiter=','
                            placeholder={'Start typing to add a route from the archives by name'}
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
                    <Col sm={1}>
                        <Button hidden={!this.state.busy}>{[ '', Spinner ]}</Button>
                    </Col>
                </Row>
            </TabPane>
        );
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
    }


    // -------------------------------------------------------
    // Routes Archive
    // -------------------------------------------------------

    private showArchivedRoutes(): void {
        const mapComponent = (this.props.mapComponent as MapComponent);
        const infoControl: any = this.infoControl;

        this.archivedRoutesLayerGroup = L.layerGroup()
            .addTo(mapComponent.map);
        this.infoControl
            .addTo(mapComponent.map);

        // -----
        const polylineOptions: any = {color: 'green', weight: 5, opacity: 0.4};
        this.state.archivedRoutes.map((archivedRoute: IArchivedRoute) => {
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
    
    private selectArchivedRoute(archivedRouteId: number) {
        this.setState({ busy: true });
        const mapComponent = (this.props.mapComponent as MapComponent);
        this.props.getArchivedRoute(archivedRouteId)
            .then(async (archivedRoute?: IArchivedRoute) => {
                let routesAsLatLngs: Array<Array<[number, number]>> = mapComponent.getRoutesAsLatLngs();
                routesAsLatLngs = archivedRoute ? routesAsLatLngs.concat(archivedRoute.routes) : routesAsLatLngs;
                mapComponent.setRoutesFromLatLngs(routesAsLatLngs);
                mapComponent.fitBounds();
                await this.saveRouteChange(true, true);
            })
            .finally(() => {
                this.setState({ busy: false });
            });
    }

    private setDefaultInfoControlMessage(): void {
        const infoControl: any = this.infoControl;
        const defaultInfoControlMessage: string = 'Hover over a route for details.  Click to import.';
        infoControl.update(defaultInfoControlMessage);
    }

    private async saveRouteChange(routesChanged: boolean = false, currentRouteIndexChanged: boolean = false): Promise<void> {
        const mapComponent = (this.props.mapComponent as MapComponent);
        if (routesChanged || currentRouteIndexChanged) {
            mapComponent.adjustRoutePositionIndicators(true);
        }
        const routesAsLatLngs: Array<Array<[number, number]>> = mapComponent.getRoutesAsLatLngs();
        this.props.saveRouteChange(routesAsLatLngs, mapComponent.currentRouteIndex);
    }
    
    private async undoLastRouteEdit(): Promise<void> {
        const [routesAsLatLngs, currentRouteIndex, canUndoLastRouteEdit] = await this.props.undoLastRouteEdit();
        const mapComponent = (this.props.mapComponent as MapComponent);
        mapComponent.setRoutesFromLatLngs(routesAsLatLngs);
        mapComponent.currentRouteIndex = currentRouteIndex;
    }

}

