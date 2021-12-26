import * as L from 'leaflet';
import 'src/leaflet-editable/leaflet-editable.js';
import 'leaflet-gpx';
import * as React from 'react';
import Col from 'reactstrap/lib/Col';
import { Button, CustomInput, ButtonGroup, Row, FormText, TabPane } from 'reactstrap';
import { MdInfo, MdAddCircle, MdClear, MdUndo, MdTimeline, MdNavigateNext, MdNavigateBefore, MdClearAll, MdContentCut, MdZoomOutMap} from 'react-icons/md';
import { GiJoint } from 'react-icons/gi';
import { IoMdSwap } from 'react-icons/io';
import { AiOutlineRollback } from 'react-icons/ai';
import { Spinner } from '../Widgets';
import { ButtonWithTooltip } from '../ButtonWithTooltip';
import { IMap } from 'src/Interfaces';
import { Component } from 'react';
import { MapComponent } from './MapComponent';
import memoizeOne from 'memoize-one';

export class EditRoutesTab extends Component<{
    isActiveTab: boolean,
    mapComponent: MapComponent | undefined,
    nz50MapsBySheet: { [mapSheet: string] : IMap },
    routesAsLatLngs: Array<Array<[number, number]>>,
    currentRouteIndex: number,
    canUndoLastRouteEdit: boolean,
    saveRouteChange: (routesAsLatLngs: Array<Array<[number, number]>>, currentRouteIndex?: number) => Promise<void>,
    undoLastRouteEdit: () => Promise<[Array<Array<[number, number]>>, number, boolean]> 
},{
    splitMode: boolean,
    gpxFile?: File,
    invalidGpxFile: boolean,
    busy: boolean
}>{

    private mapIsSetup: boolean = false;
    private infoControl: L.Control;

    private vertexIsDragging: boolean = false;

    
    private memoizedSetUpMap = memoizeOne((mapComponent: MapComponent | undefined) => {
        if (mapComponent && !this.mapIsSetup) {
            this.setUpMap();
            this.mapIsSetup = true;
        }
    });

    private memoizedContinueOrEndRoute = memoizeOne((mapIsSetup: boolean, isActiveTab: boolean) => {
        if (mapIsSetup) {
            if (isActiveTab) {
                // this.props.mapComponent?.map.invalidateSize();
                setTimeout(() => this.continueRoute(), 0);
            } else if (!isActiveTab) {
                this.endRoute();
            }
        }
    });


    constructor(props:any) {
        super(props);

        this.state = { 
            splitMode: false,
            gpxFile: undefined,
            invalidGpxFile: false,

            busy: false
        };

    }

    public render() {

        this.memoizedSetUpMap(this.props.mapComponent);
        this.memoizedContinueOrEndRoute(this.mapIsSetup, this.props.isActiveTab);

        const addRoute = async () => {
            await this.endRoute();
            await this.addRoute();
            await this.continueRoute();
        }
        const deleteRoute = async () => {
            await this.endRoute();
            await this.deleteRoute();
            await this.continueRoute();
        }
        const clearAllRoutes = async () => {
            await this.endRoute();
            await this.clearAllRoutes();
            await this.continueRoute();
        }
        const previousRoute = async () => {
            await this.endRoute();
            await this.previousRoute();
            await this.continueRoute();
        }
        const nextRoute = async () => {
            await this.endRoute();
            await this.nextRoute();
            await this.continueRoute();
        }
        const zoomToRoutes = () => {
            this.props.mapComponent?.fitBounds();
        }
        const joinRoute = async () => {
            await this.endRoute();
            await this.joinNextRoute();
            await this.continueRoute();
        }
        const splitRoute = () => {
            this.setState( { splitMode: !this.state.splitMode })
        }
        const swapRoute = async () => {
            await this.endRoute();
            await this.swapNextRoute();
            await this.continueRoute();
        }
        const reverseRoute = async () => {
            await this.endRoute();
            await this.reverseRoute();
            await this.continueRoute();
        }
        const generalizeRoute = async () => {
            await this.endRoute();
            await this.generalizeRoute();
            await this.continueRoute();
        }
        const undoLastRouteEdit = async () => {
            await this.endRoute();
            await this.undoLastRouteEdit();
            await this.continueRoute();
        }
        const importGpx = async (e: any) => {
            const gpxFile = e.target.files ? e.target.files[0] : null;
            e.target.value = null; // allow selecting the same file again
            this.setState( {gpxFile});
            await this.endRoute();
            await this.importGpxFromFile(gpxFile);
            const mapComponent = (this.props.mapComponent as MapComponent);
            const currentRoute = mapComponent.routes[this.props.currentRouteIndex];
            if (currentRoute.getLatLngs().length === 0) {
                await this.deleteRoute();
            }
            await this.saveRouteChange(true, true);
            await this.continueRoute();
        }
        
        return (
            <TabPane tabId="EditRoutes">
                <Row className="mb-2 ml-1">
                    <FormText color='muted'>Click points on map to draw route, or import route from GPX file</FormText>
                    <a href="https://youtu.be/0NFCjs_BJok" target="_blank">
                        <MdInfo size="30" color="#6899e4" style={{padding: '4px'}}/>
                    </a>
                </Row>
                <Row className="mb-2">
                    <Col sm={5}>
                        <ButtonGroup>
                            <ButtonWithTooltip id="ZoomToRoutesButton2" color='secondary' 
                                onClick={zoomToRoutes} disabled={!this.props.mapComponent || this.props.mapComponent.routes.length === 0} 
                                placement="top" tooltipText="Zoom to route extents">
                                    <MdZoomOutMap/>
                            </ButtonWithTooltip>
                            <ButtonWithTooltip id="PreviousRouteButton" color='secondary' 
                                onClick={previousRoute} disabled={this.props.currentRouteIndex <= 0} 
                                placement="top" tooltipText="Edit the previous route">
                                    <MdNavigateBefore/>
                            </ButtonWithTooltip>
                            <ButtonWithTooltip id="NextRouteButton" color='secondary' 
                                onClick={nextRoute} disabled={!this.props.mapComponent || this.props.currentRouteIndex >= this.props.mapComponent.routes.length - 1} 
                                placement="top" tooltipText="Edit the next route">
                                    <MdNavigateNext/>
                            </ButtonWithTooltip>
                        </ButtonGroup>
                        <ButtonGroup>
                            <ButtonWithTooltip id="SimplifyRouteButton" color='secondary' 
                                onClick={generalizeRoute} disabled={!this.props.mapComponent || this.props.mapComponent.routes.length === 0} 
                                placement="top" tooltipText="Simplify route for current zoom level">
                                    <MdTimeline/>
                            </ButtonWithTooltip>
                            <ButtonWithTooltip id="JoinRouteButton" color='secondary' 
                                onClick={joinRoute} disabled={!this.props.mapComponent || this.props.currentRouteIndex >= this.props.mapComponent.routes.length - 1} 
                                placement="top" tooltipText="Join current route with the next route">
                                    <GiJoint/>
                            </ButtonWithTooltip>
                            <ButtonWithTooltip id="SplitRouteButton" color={this.state.splitMode ? 'danger' : 'secondary'} 
                                onClick={splitRoute} disabled={this.props.currentRouteIndex < 0} 
                                placement="top" tooltipText="Split the current route at the next vertex clicked">
                                    <MdContentCut/>
                            </ButtonWithTooltip>
                            <ButtonWithTooltip id="SwapRouteButton" color='secondary' 
                                onClick={swapRoute} disabled={!this.props.mapComponent || this.props.currentRouteIndex >= this.props.mapComponent.routes.length - 1} 
                                placement="top" tooltipText="Swap the current route with the next route">
                                    <IoMdSwap/>
                            </ButtonWithTooltip>
                            <ButtonWithTooltip id="ReverseRouteButton" color='secondary' 
                                onClick={reverseRoute} disabled={this.props.currentRouteIndex < 0} 
                                placement="top" tooltipText="Reverse the direction of the current route">
                                    <AiOutlineRollback/>
                            </ButtonWithTooltip>
                        </ButtonGroup>
                        <ButtonGroup>
                            <ButtonWithTooltip id="AddRouteButton" color='secondary' 
                                onClick={addRoute} disabled={false} 
                                placement="top" tooltipText="Add new route">
                                <MdAddCircle/>
                            </ButtonWithTooltip>
                            <ButtonWithTooltip id="DeleteRouteButton" color='secondary' 
                                onClick={deleteRoute} disabled={!this.props.mapComponent || this.props.mapComponent.routes.length === 0}  
                                placement="top" tooltipText="Delete current route">
                                    <MdClear/>
                            </ButtonWithTooltip>
                            <ButtonWithTooltip id="ClearAllRoutesButton" color='secondary' 
                                onClick={clearAllRoutes} disabled={!this.props.mapComponent || this.props.mapComponent.routes.length === 0}  
                                placement="top" tooltipText="Clear all routes">
                                    <MdClearAll/>
                            </ButtonWithTooltip>
                            <ButtonWithTooltip id="UndoButton1" color='secondary' 
                                onClick={undoLastRouteEdit} disabled={!this.props.canUndoLastRouteEdit} 
                                placement="top" tooltipText="Undo last change">
                                    <MdUndo/>
                            </ButtonWithTooltip>
                            <a href="https://youtu.be/UZ3qVtAviRE" target="_blank">
                                        <MdInfo size="36" color="#6899e4" style={{padding: '7px'}}/>
                            </a>
                        </ButtonGroup>
                    </Col>
                    <Col sm={6}>
                        <ButtonGroup>
                            <CustomInput
                                type="file" id="GpxFileInput" name="customFile"
                                label={this.state.gpxFile ? this.state.gpxFile.name : 'Import from GPX'}
                                onChange={importGpx}
                                invalid={this.state.invalidGpxFile} 
                            />
                            <a href="https://youtu.be/SO9joIDj2To" target="_blank">
                                    <MdInfo size="36" color="#6899e4" style={{padding: '7px'}}/>
                            </a>
                        </ButtonGroup>
                    </Col>
                    <Col sm={1}>
                        <Button hidden={!this.state.busy}>{[ '', Spinner ]}</Button>
                    </Col>
                </Row>
            </TabPane>
        );
    }

    protected setUpMap(): void {
        (this.props.mapComponent as MapComponent).setRoutesFromLatLngs(this.props.routesAsLatLngs);
        (this.props.mapComponent as MapComponent).currentRouteIndex = this.props.currentRouteIndex;

        (this.props.mapComponent as MapComponent).fitBounds();

        (this.props.mapComponent as MapComponent).map.on('editable:vertex:click', async (event: any) => {
            if (this.state.splitMode) {
                const vertex = event.vertex as L.VertexMarker;
                const index = vertex.getIndex(); // HACK ALERT: See splitRoute()
                await this.endRoute();
                await this.splitRoute(vertex, index);
                await this.continueRoute();
            }
        });

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
    // Route editing
    // -------------------------------------------------------

    private async continueRoute(): Promise<void> {
        const mapComponent = (this.props.mapComponent as MapComponent);
        if (mapComponent.routes.length > 0) {
            const currentRoute = mapComponent.routes[this.props.currentRouteIndex];
            if (currentRoute.getLatLngs().length === 0) {
                currentRoute.addTo(mapComponent.map);  // Workaround: empty route not on map after route.disableEdit()
            }
            currentRoute.enableEdit();
            this.setRouteEventsOn(currentRoute);
            ((currentRoute as any).editor as L.PolylineEditor).continueForward();
        } else {
            await this.addRoute();
            const currentRoute = mapComponent.routes[this.props.currentRouteIndex];
            this.setRouteEventsOn(currentRoute);
        }
        mapComponent.adjustRoutePositionIndicators(true);
        this.setState({ splitMode: false });

        this.infoControl.addTo(mapComponent.map);
        (this.infoControl as any).update('<b>Editing route ' + (this.props.currentRouteIndex + 1).toString() + ' of ' + mapComponent.routes.length.toString() + '</b>');
    }

    private async endRoute(): Promise<void> {
        const mapComponent = (this.props.mapComponent as MapComponent);
        if (mapComponent.routes.length > 0) {
            const currentRoute = mapComponent.routes[this.props.currentRouteIndex] as L.Polyline;
            this.setRouteEventsOff(currentRoute);
            currentRoute.disableEdit();
        };

        this.infoControl.remove();
    }

    // --------

    private async addRoute(): Promise<void> {
        const mapComponent = (this.props.mapComponent as MapComponent);
        const newRoutes = mapComponent.routes.slice();
        if (newRoutes.length > 0 && newRoutes[mapComponent.routes.length - 1].getLatLngs().length === 0) {
            // reuse any existing empty route
            return;
        }
        await this.updateRoutesState(this.addEmptyRoute(newRoutes), newRoutes.length - 1);
    }

    private async deleteRoute(): Promise<void> {
        const mapComponent = (this.props.mapComponent as MapComponent);
        let newRoutes = mapComponent.routes.slice();
        if (mapComponent.routes.length > 0) {
            const currentRoute = mapComponent.routes[this.props.currentRouteIndex];
            currentRoute.remove();
            newRoutes.splice(this.props.currentRouteIndex, 1);
        };
        if (newRoutes.length === 0) {
            newRoutes = this.addEmptyRoute(newRoutes);
        }
        await this.updateRoutesState(newRoutes, Math.min(this.props.currentRouteIndex, newRoutes.length - 1));
    }

    private async clearAllRoutes(): Promise<void> {
        const mapComponent = (this.props.mapComponent as MapComponent);
        mapComponent.routes.forEach((route: L.Polyline) => {
            route.remove();
        });
        await this.updateRoutesState(this.addEmptyRoute([]), 0);
    }

    private addEmptyRoute(routes: L.Polyline[]): L.Polyline[] {
        const mapComponent = (this.props.mapComponent as MapComponent);
        const route = mapComponent.map.editTools.startPolyline(undefined, {});
        routes.push(route);
        return routes;
    }

    private async previousRoute(): Promise<void> {
        const mapComponent = (this.props.mapComponent as MapComponent);
        if (this.props.currentRouteIndex > 0) {
            await this.updateRoutesState(mapComponent.routes, this.props.currentRouteIndex - 1);
        }
    }

    private async nextRoute(): Promise<void> {
        const mapComponent = (this.props.mapComponent as MapComponent);
        if (this.props.currentRouteIndex < mapComponent.routes.length - 1) {
            await this.updateRoutesState(mapComponent.routes, this.props.currentRouteIndex + 1);
        }
    }

    private async joinNextRoute(): Promise<void> {
        const mapComponent = (this.props.mapComponent as MapComponent);
        if (this.props.currentRouteIndex < mapComponent.routes.length - 1) {
            const currentRoute = mapComponent.routes[this.props.currentRouteIndex];
            const nextRoute = mapComponent.routes[this.props.currentRouteIndex + 1];
            nextRoute.setLatLngs((currentRoute.getLatLngs() as L.LatLng[][]).concat(nextRoute.getLatLngs() as L.LatLng[][]));
            await this.deleteRoute();
        }
    }

    private async swapNextRoute(): Promise<void> {
        const mapComponent = (this.props.mapComponent as MapComponent);
        if (this.props.currentRouteIndex < mapComponent.routes.length - 1) {
            const currentRoute = mapComponent.routes[this.props.currentRouteIndex];
            const nextRoute = mapComponent.routes[this.props.currentRouteIndex + 1];
            const currentRouteLatLngs = currentRoute.getLatLngs();
            currentRoute.setLatLngs(nextRoute.getLatLngs());
            nextRoute.setLatLngs(currentRouteLatLngs);
            await this.updateRoutesState(mapComponent.routes);
        }
    }

    private async reverseRoute(): Promise<void> {
        const mapComponent = (this.props.mapComponent as MapComponent);
        if (this.props.currentRouteIndex >= 0) {
            const currentRoute = mapComponent.routes[this.props.currentRouteIndex];
            currentRoute.setLatLngs(currentRoute.getLatLngs().reverse());
            await this.updateRoutesState(mapComponent.routes);
        }
    }

    // HACK ALERT: The default behaviour when clicking an existing vertex is to delete it.  By the time we get here,
    // the current routes has the clicked vertex removed. So we need to pass in the vertex and index, from 
    // before it was deleted, so that we can re-add it.
    private async splitRoute(vertex: L.VertexMarker, index: number): Promise<void> {
        const mapComponent = (this.props.mapComponent as MapComponent);
        if (mapComponent.routes.length > 0) {
            const currentRoute = mapComponent.routes[this.props.currentRouteIndex] as L.Polyline;
            const latLngs = currentRoute.getLatLngs() as L.LatLng[];
            if (index >= 0 && index <= latLngs.length) {
                if (index === 0) {
                    latLngs.unshift(new L.LatLng(vertex.getLatLng().lat, vertex.getLatLng().lng)); // re-add vertex
                    currentRoute.setLatLngs(latLngs);
                } else if (index === latLngs.length) {
                    latLngs.push(new L.LatLng(vertex.getLatLng().lat, vertex.getLatLng().lng)); // re-add vertex
                    currentRoute.setLatLngs(latLngs);
                } else {
                    const firstPart = latLngs.slice(0, index);
                    firstPart.push(new L.LatLng(vertex.getLatLng().lat, vertex.getLatLng().lng)); // re-add vertex
                    currentRoute.setLatLngs(firstPart);
    
                    let secondPart: L.LatLng[] = [];
                    secondPart.push(new L.LatLng(vertex.getLatLng().lat, vertex.getLatLng().lng)); // re-add vertex
                    if (index < latLngs.length) {
                        secondPart = secondPart.concat(latLngs.slice(index));
                    }
                    const newRoute = mapComponent.addArrowheads(L.polyline(secondPart, {})).addTo(mapComponent.map);
                    
                    const newRoutes = mapComponent.routes.slice(0, this.props.currentRouteIndex + 1).concat(newRoute).concat(
                        mapComponent.routes.slice(this.props.currentRouteIndex + 1));
                    await this.updateRoutesState(newRoutes, this.props.currentRouteIndex + 1);
                }
            }
        }
    }

    private async generalizeRoute(): Promise<void> {
        const mapComponent = (this.props.mapComponent as MapComponent);
        if (mapComponent.routes.length > 0) {
            const zoom = mapComponent.map.getZoom();
            const tolerance = mapComponent.getTolerance(zoom);
            const currentRoute = mapComponent.routes[this.props.currentRouteIndex];
            const generalizedLatLngs: L.LatLng[] = mapComponent.generalize(currentRoute.getLatLngs() as L.LatLng[], tolerance);
            currentRoute.remove();
            const generalizedRoute = mapComponent.addArrowheads(L.polyline(generalizedLatLngs, {})).addTo(mapComponent.map);
            const newRoutes = mapComponent.routes.slice(); // shallow clone
            newRoutes[this.props.currentRouteIndex] = generalizedRoute;
            await this.updateRoutesState(newRoutes, this.props.currentRouteIndex);
        }
    }

    private async updateRoutesState(routes?: L.Polyline[], currentRouteIndex?: number): Promise<void> {
        const mapComponent = (this.props.mapComponent as MapComponent);
        if (routes !== undefined) {
            mapComponent.routes = routes;
        }
        if (currentRouteIndex !== undefined) {
            mapComponent.currentRouteIndex = currentRouteIndex;
        }
        await this.saveRouteChange(routes !== undefined, currentRouteIndex !== undefined ); 
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
        route.on('editable:vertex:new', () => {
            // arrowheads don't work when polyline has < 2 vertices
            if (route.getLatLngs().length > 1 && !((route as any).getArrowheads())) {
                const mapComponent = (this.props.mapComponent as MapComponent);
                mapComponent.addArrowheads(route);
            }
        })
        route.on('editable:vertex:deleted', () => {
            // arrowheads don't work when polyline has < 2 vertices
            if (route.getLatLngs().length <= 1 && (route as any).getArrowheads()) {
                (route as any).getArrowheads().remove();
            }
        })
    }

    private setRouteEventsOff(route: L.Polyline) {
        route.off('editable:vertex:dragstart');
        route.off('editable:vertex:dragend');
        route.off('editable:editing');
        route.off('editable:vertex:new');
        route.off('editable:vertex:deleted');
    }

    private importGpxFromFile(gpxFile: File): Promise<void> {
        const mapComponent = (this.props.mapComponent as MapComponent);
        return new Promise<void>((resolve, reject) => {
            if (!gpxFile) {
                reject();
            }
            const reader = new FileReader();
    
            reader.onload = () => {
                this.setState({ busy: true });
                const gpx = reader.result as string;
                mapComponent.importGpx(gpx)
                    .then(() => {
                        this.setState({invalidGpxFile: false, busy: false });
                        resolve();
                    }, () => {
                        this.setState({invalidGpxFile: true, busy: false })
                        reject();
                    });
            };
    
            reader.readAsText(gpxFile);
        });
    }

}

