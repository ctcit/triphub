import * as React from 'react';
import { Component } from 'react';
import { Form, FormGroup, Label, Col  } from 'reactstrap';
import { App } from './App';
import { Control, IControlOwner } from './Control';
import './index.css';
import './print.css';
import { Trip } from './Trip';
import { IValidation, IMap } from './Interfaces';
import { MapControl } from './MapControl';

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

      constructor(props: any){
        super(props)
        this.state = {editMap:false, editMaps:false}
        this.href = this.props.owner.state.trip.href
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
        const common = {
            readOnly: trip.id !== -1 && !this.props.owner.isPrivileged(), 
            owner:this
        }

        // BJ TODO: remove 3 map limit
        const getMapSheets = (): string[] => {
            const mapSheets: string[] = [];
            ["map1", "map2", "map3"].forEach((mapFieldId: string) => {
                const mapSheet = this.get(mapFieldId);
                if (mapSheet && mapSheet !== "") {
                    const parts = mapSheet.split(" ");
                    if (parts.length > 0 && this.nz50MapsBySheet[parts[0]]) {
                        mapSheets.push(parts[0]);
                    }
                }
            });
            return mapSheets;
        }

        const getRoutesAsJson = (): string => {
            return this.get("mapRoute");
        }

        // BJ TODO: remove 3 map limit
        const saveMapChanges = (mapSheets: string[] | undefined, routesAsJson: string | undefined): Promise<void> => {
            const body: any = {};
            if (mapSheets) {
                body.map1 = mapSheets.length > 0 ? mapSheets[0] + " " +  this.nz50MapsBySheet[mapSheets[0]] : "";
                body.map2 = mapSheets.length > 1 ? mapSheets[1] + " " +  this.nz50MapsBySheet[mapSheets[1]] : "";
                body.map3 = mapSheets.length > 2 ? mapSheets[2] + " " +  this.nz50MapsBySheet[mapSheets[2]] : "";
            }
            if (routesAsJson) {
                body.mapRoute = routesAsJson;
            }
            return this.saveTrip(body);
        }

        return [
            <Form key='form'>
                <Control id='title' label='Title' type='text' {...common}/>
                <Control id='openDate' label='Open Date' type='date'  {...common}/>
                <Control id='closeDate' label='Close Date' type='date'  {...common}/>
                <Control id='tripDate' label='Trip Date' type='date'  {...common}/>
                <Control id='length' label='Length in days' type='number' {...common}/>
                <Control id='isSocial' label='Is social event' type='checkbox' {...common}/>
                <Control id='isNoSignup' label='No sign up list' type='checkbox' {...common} 
                                        hidden={!trip.isSocial}/>
                <Control id='departurePoint' label='Departure Point' type='text' list='departure_point_list' {...common}/>
                <Control id='departureDetails' label='Departure Details' type='text' {...common}/>
                <Control id='cost' label='Cost' type='text'  {...common}/>
                <Control id='grade' label='Grade' type='text' list='grade_list'  {...common}/>
                <Control id='isLimited' label='Limited Numbers' type='checkbox' {...common} 
                                        hidden={trip.isSocial && trip.isNoSignup}/>
                <Control id='maxParticipants' label='Maximum trampers' type='number' {...common} 
                                        hidden={!trip.isLimited || (trip.isSocial && trip.isNoSignup)}/>
                <Control id='description' label='Description' type='textarea'  {...common}/>
                <Control id='logisticnfo' label='Logistic Information' type='textarea'  {...common}/>
                <FormGroup row={true} hidden={trip.isSocial}>
                    <Label sm={2}>Maps/Routes</Label>
                    <Col sm={10}>
                        <MapControl nz50MapsBySheet={this.nz50MapsBySheet} readOnly={common.readOnly} mapSheets={getMapSheets()} routesAsJson={getRoutesAsJson()} saveMapChanges={saveMapChanges}/>
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
                <option value='Caltex Russley Road' />
            </datalist>
    ]
    }

    public saveTrip(body: any): Promise<void> {
        return this.app.apiCall('POST', this.href as string, body, true);
    }

}
