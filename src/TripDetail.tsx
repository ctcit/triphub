import * as React from 'react';
import { Component } from 'react';
import { Form, FormGroup, Label, Col  } from 'reactstrap';
import { App } from './App';
import { Control } from './Control';
import './index.css';
import './print.css';
import { Trip } from './Trip';
import { IValidation } from './Interfaces';
import { MapControl } from './MapControl';

export class TripDetail extends Component<{
        owner: Trip,
        app: App,
    },{
        editMap: boolean
        editMaps: boolean
    }> {

      public href?: string
      public app: App

      constructor(props: any){
        super(props)
        this.state = {editMap:false, editMaps:false}
        this.href = this.props.owner.state.trip.href
        this.app = this.props.app
        this.get = this.get.bind(this)
        this.set = this.set.bind(this)
        this.validate = this.validate.bind(this)
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
                        <MapControl app={this.props.app} readOnly={common.readOnly}/>
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
}
