import * as React from 'react';
import { Component } from 'react';
import { Button, Form, FormGroup, Label, Col  } from 'reactstrap';
import { App } from './App';
import { Control } from './Control';
import './index.css';
import './print.css';
import { Trip } from './Trip';
import Collapse from 'reactstrap/lib/Collapse';
import { IValidation, IMap } from './Interfaces';
import { MapGrid } from './MapGrid';

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
        const readOnly = {readOnly: !this.props.owner.isPrivileged()}
        const toggleMap = () => this.setState({editMap:!this.state.editMap})
        const toggleMaps = () => this.setState({editMaps:!this.state.editMaps})

        return [
            <Form key='form'>
                <Control owner={this} id='title' label='Title' type='text' {...readOnly}/>
                <Control owner={this} id='openDate' label='Open Date' type='date'  {...readOnly}/>
                <Control owner={this} id='closeDate' label='Close Date' type='date'  {...readOnly}/>
                <Control owner={this} id='tripDate' label='Trip Date' type='date'  {...readOnly}/>
                <Control owner={this} id='length' label='Length in days' type='number' {...readOnly}/>
                <Control owner={this} id='isSocial' label='Is social event' type='checkbox' {...readOnly}/>
                <Control owner={this} id='isNoSignup' label='No sign up list' type='checkbox' {...readOnly} 
                                        hidden={!this.props.owner.state.trip.isSocial}/>
                <Control owner={this} id='departurePoint' label='Departure Point' type='text' list='departure_point_list' {...readOnly}/>
                <Control owner={this} id='departureDetails' label='Departure Details' type='text' {...readOnly}/>
                <Control owner={this} id='cost' label='Cost' type='text'  {...readOnly}/>
                <Control owner={this} id='grade' label='Grade' type='text' list='grade_list'  {...readOnly}/>
                <Control owner={this} id='maxParticipants' label='Maximum trampers' type='number' {...readOnly} 
                                        hidden={this.props.owner.state.trip.isSocial && this.props.owner.state.trip.isNoSignup}/>
                <Control owner={this} id='description' label='Description' type='textarea'  {...readOnly}/>
                <Control owner={this} id='logisticnfo' label='Logistic Information' type='textarea'  {...readOnly}/>
                <FormGroup row={true}>
                    <Label sm={2}>Maps</Label>
                    <Col sm={1}>
                        <Button hidden={readOnly.readOnly} onClick={toggleMaps}>{this.state.editMaps ? 'Hide' : 'Edit'}</Button>
                    </Col>
                    <Col sm={2}>{this.props.owner.state.trip.map1}</Col>
                    <Col sm={2}>{this.props.owner.state.trip.map2}</Col>
                    <Col sm={2}>{this.props.owner.state.trip.map3}</Col>
                    <Col sm={2}>{this.props.owner.getRouteSummary()}</Col>
                </FormGroup>
                <Control owner={this} id='map1' label='Map 1' type='text' list='mapslist' {...readOnly} hidden={!this.state.editMaps}/>
                <Control owner={this} id='map2' label='Map 2' type='text' list='mapslist' {...readOnly} hidden={!this.state.editMaps}/>
                <Control owner={this} id='map3' label='Map 3' type='text' list='mapslist' {...readOnly} hidden={!this.state.editMaps}/>
                { this.state.editMaps ? <MapGrid owner={this.props.owner}/> : '' }
                <FormGroup row={true}>
                    <Label sm={2}>Map</Label>
                    <Col sm={1}>
                        <Button hidden={readOnly.readOnly} onClick={toggleMap}>{this.state.editMap ? 'Hide' : 'Edit'}</Button>
                    </Col>
                    <Col sm={9}>
                        <div dangerouslySetInnerHTML={{__html: this.props.owner.state.trip.mapHtml}}/>    
                    </Col>
                </FormGroup>
                <Collapse isOpen={this.state.editMap}>
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
                    <Control key='control' owner={this} id='mapHtml' label='' type='textarea'/>
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
            <datalist key='mapslist' id='mapslist'>
                {this.props.app.getMaps()
                     .map((m:IMap) => <option key={'map'+m.sheetCode} value={m.sheetCode + ' ' + m.name} />)}
            </datalist>
    ]
    }
}
