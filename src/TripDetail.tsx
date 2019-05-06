import * as React from 'react';
import { Component } from 'react';
import { Button, Form, FormGroup, Label, Col  } from 'reactstrap';
import { App } from './App';
import { Control } from './Control';
import './index.css';
import './print.css';
import { Trip } from './Trip';
import Collapse from 'reactstrap/lib/Collapse';
import { IValidation } from './Interfaces';

export class TripDetail extends Component<{
        owner: Trip,
        app: App,
    },{
        edit_map: boolean
    }> {

      public href?: string
      public app: App

      constructor(props: any){
        super(props)
        this.state = {edit_map:false}
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
        const readOnly = {readOnly: !this.props.owner.isPrivileged()}
        const toggleMap = () => this.setState({edit_map:!this.state.edit_map})

        return [
            <Form key='form'>
                <Control owner={this} id='title' label='Title' type='text' {...readOnly}/>
                <Control owner={this} id='open_date' label='Open Date' type='date'  {...readOnly}/>
                <Control owner={this} id='close_date' label='Close Date' type='date'  {...readOnly}/>
                <Control owner={this} id='trip_date' label='Trip Date' type='date'  {...readOnly}/>
                <Control owner={this} id='length' label='Length in days' type='number' {...readOnly}/>
                <Control owner={this} id='departure_point' label='Departure Point' type='text' list='departure_point_list' {...readOnly}/>
                <Control owner={this} id='cost' label='Cost' type='text'  {...readOnly}/>
                <Control owner={this} id='grade' label='Grade' type='text' list='grade_list'  {...readOnly}/>
                <Control owner={this} id='max_participants' label='Maximum trampers' type='number' {...readOnly}/>
                <Control owner={this} id='description' label='Description' type='textarea'  {...readOnly}/>
                <Control owner={this} id='logistic_info' label='Logistic Information' type='textarea'  {...readOnly}/>
                <FormGroup row={true}>
                    <Label sm={2}>Map</Label>
                    <Col sm={1}>
                        <Button hidden={readOnly.readOnly} onClick={toggleMap}>{this.state.edit_map ? 'Hide' : 'Edit'}</Button>
                    </Col>
                    <Col sm={9}>
                        <div dangerouslySetInnerHTML={{__html: this.props.owner.state.trip.map_html}}/>    
                    </Col>
                </FormGroup>
                <Collapse isOpen={this.state.edit_map}>
                    <FormGroup key='instructions' row={true}>
                        <Label sm={2}>Map HTML</Label>
                        <Col sm={1}>
                            <div>To get map:</div>,
                        </Col>
                        <Col sm={9}>
                            <ol>
                                <li>Go to <a href='http://www.topomap.co.nz/' target='new'>www.topomap.co.nz</a></li>
                                <li>Navigate to a location</li>
                                <li>Click on <b>Share Map</b></li>
                                <li>Check <b>Embed map in web page</b></li>
                                <li>Copy the relevant text</li>
                                <li>Paste it below:</li>
                            </ol>
                        </Col>
                    </FormGroup>
                    <Control key='control' owner={this} id='map_html' label='' type='textarea'/>
                </Collapse>
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
            </datalist>,
        ]
    }
}
