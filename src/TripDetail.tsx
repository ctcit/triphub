import * as React from 'react';
import { Component } from 'react';
import { Form, FormGroup, Label, Col  } from 'reactstrap';
import { App } from './App';
import { SaveableControl, IControlOwner } from './SaveableControl';
import './index.css';
import './print.css';
import { Trip } from './Trip';
import { IValidation, IMap, IArchivedRoute } from './Interfaces';
import { MapControl } from './MapControl';
import { BaseUrl } from 'src';

export class TripDetail extends Component<{
        owner: Trip,
        app: App,
    },{
        editMap: boolean
        editMaps: boolean
    }> implements IControlOwner {

      public href?: string
      public app: App

      private nz50MapsBySheet: { [mapSheet: string] : IMap } = {};
      private archivedRoutesById: { [archivedRouteId: string] : IArchivedRoute } = {};

      constructor(props: any){
        super(props)
        this.state = {
            editMap:false, 
            editMaps:false
        }
        this.href = this.props.owner.props.href
        this.app = this.props.app
        this.get = this.get.bind(this)
        this.set = this.set.bind(this)
        this.validate = this.validate.bind(this)

        // BJ TODO: move to App
        const nz50Maps: IMap[] = this.props.app.getMaps();
        this.nz50MapsBySheet = {};
        nz50Maps.forEach((nz50Map: IMap) => {
            this.nz50MapsBySheet[nz50Map.sheetCode] = nz50Map;
        });

        // BJ TODO: move to App
        const archivedRoutes: IArchivedRoute[] = this.props.app.getArchivedRoutes();
        this.archivedRoutesById = {};
        archivedRoutes.forEach((archivedRoute: IArchivedRoute) => {
            this.archivedRoutesById[archivedRoute.id] = archivedRoute;
        });
    }

    public validate() : IValidation[] {
        return this.app.validateTrip(this.props.owner.state.trip)
    }

    public get(id: string) : any{
        return this.props.owner.state.trip[id]
    }

    public set(id: string, val: any) : void {
        this.props.owner.setState({trip: {...this.props.owner.state.trip, [id]: val}})
    }

    public render(){
        const trip = this.props.owner.state.trip
        const isNoSignup = trip.isSocial && trip.isNoSignup
        const common = {
            readOnly: trip.id !== -1 && !this.props.owner.isPrivileged(), 
            owner: this
        }

        const getMapSheets = (): string[] => (trip.maps || []).map(map => map.split(' ')[0])
        const getRoutesAsJson = (): string => trip.mapRoute

        const saveMapChanges = (mapSheets: string[], routesAsJson: string): Promise<void> =>
            this.saveTrip({
                maps: mapSheets.map( map => `${map} ${this.nz50MapsBySheet[mapSheets[0]].name}`),
                mapRoute: routesAsJson
            })

        // TODO Move to service
        const getArchivedRoute = (archivedRouteId: string): Promise<IArchivedRoute | undefined> =>  {
            return this.app.apiCall('GET', BaseUrl + '/routes/' + archivedRouteId )
                .then((response: IArchivedRoute[]) => response !== null && response.length > 0 ? response[0] : undefined);  
        }
        const updateArchivedRouteSummary = (archivedRouteId: string, routeSummary: string): Promise<void> =>  {
            return this.app.apiCall('PATCH', BaseUrl + '/routes/' + archivedRouteId, routeSummary );  
        }

        return [
            <Form key='form'>
                <SaveableControl id='title' label='Title' type='text' {...common}/>
                <SaveableControl id='tripDate' label='Trip Date' type='date'  {...common}/>
                <SaveableControl id='isSocial' label='Event Type' type='radio'
                                radioOptions={{"Social Event":true,"Tramp":false}} {...common}/>
                <SaveableControl id='isNoSignup' label='No sign up list' type='checkbox' {...common} 
                                        hidden={!trip.isSocial}/>
                <SaveableControl id='length' label='Length in days' type='number' hidden={trip.isSocial} {...common}/>
                <SaveableControl id='openDate' label='Open Date' type='date' hidden={isNoSignup} {...common}/>
                <SaveableControl id='closeDate' label='Close Date' type='date' hidden={isNoSignup}  {...common}/>
                <SaveableControl id='isLimited' label='Limited Numbers' type='checkbox' {...common} 
                                        hidden={isNoSignup}/>
                <SaveableControl id='maxParticipants' label='Maximum trampers' type='number' {...common} 
                                        hidden={isNoSignup || !trip.isLimited}/>
                <SaveableControl id='departurePoint' label='Departure Point' type='text' list='departure_point_list' 
                                        hidden={trip.isSocial} {...common}/>
                <SaveableControl id='departureDetails' label='Departure Details' type='text'  
                                        hidden={trip.isSocial} {...common}/>
                <SaveableControl id='cost' label='Cost' type='text'  {...common}/>
                <SaveableControl id='grade' label='Grade' type='text' list='grade_list'  {...common}/>
                <SaveableControl id='description' label='Description' type='textarea'  {...common}/>
                <SaveableControl id='logisticInfo' label='Logistic Information' type='textarea'  {...common}/>
                <FormGroup row={true} hidden={trip.isSocial}>
                    <Label sm={2}>Maps/Routes</Label>
                    <Col sm={10}>
                        <MapControl 
                            nz50MapsBySheet={this.nz50MapsBySheet} 
                            archivedRoutesById={this.archivedRoutesById}
                            readOnly={common.readOnly} 
                            mapSheets={getMapSheets()} 
                            routesAsJson={getRoutesAsJson()} 
                            saveMapChanges={saveMapChanges}
                            getArchivedRoute={getArchivedRoute} // TODO replace with service
                            updateArchivedRouteSummary={updateArchivedRouteSummary}
                        />
                    </Col>
                </FormGroup>
            </Form>,
            <datalist key='grade_list' id='grade_list'>
                <option value='Easy' />
                <option value='Mod' />
                <option value='ModHard' />
                <option value='Hard' />
            </datalist>,
            <datalist key='departure_point_list' id='departure_point_list'>
                <option value='Z Papanui' />
                <option value='Z Russley Road' />
            </datalist>
    ]
    }

    public saveTrip(body: any): Promise<void> {
        return this.app.apiCall('POST', this.href as string, body, true);
    }

}
