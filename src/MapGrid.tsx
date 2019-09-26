import * as React from 'react';
import { Component } from 'react';
import { Trip } from './Trip';
import FormGroup from 'reactstrap/lib/FormGroup';
import Label from 'reactstrap/lib/Label';
import Col from 'reactstrap/lib/Col';
import ButtonGroup from 'reactstrap/lib/ButtonGroup';
import { Button } from 'reactstrap';
import Navbar from 'reactstrap/lib/Navbar';

export class MapGrid extends Component<{
    owner: Trip
},{
    isRouteMode : boolean
}>{
    constructor(props:any){
        super(props)
        this.state = {isRouteMode: false}
        this.postMessageToIFrame = this.postMessageToIFrame.bind(this)
    }

    public postMessageToIFrame(message : any) : MapGrid {
        const iframe : any = document.getElementById('map_picker_iframe')

        iframe.contentWindow.postMessage(message,"*")
        return this
    }


    public componentDidMount(){
        const owner = this.props.owner
        const trip  = this.props.owner.state.trip
        const mapGrid  = this

        function receiveMessage(event : any) {

            if ( event.data.type === 'ready') {
                mapGrid.postMessageToIFrame({type:'setState', 
                                             nz50maps: owner.props.app.getMaps(),
                                             maps: owner.getMaps(),
                                             route: owner.getRoute()})
            }

            if ( event.data.type === 'state') {
                event.data.maps.sort((a : string,b : string) => a.localeCompare(b))
                const body = {
                    map1:event.data.maps[0] || '',
                    map2:event.data.maps[1] || '',
                    map3:event.data.maps[2] || '',
                    mapRoute:JSON.stringify(event.data.route)}

                owner.setState({trip: {...trip, ...body}})
                owner.props.app.apiCall('POST', trip.href as string, body, true)
            }
        }

        window.addEventListener("message", receiveMessage, false);
    }

    public render(){
        const owner = this.props.owner
        const isRouteMode = this.state.isRouteMode
        const editRoute = () => this.postMessageToIFrame({type:'editRoute'}).setState({isRouteMode:true})
        const selectMaps = () => this.postMessageToIFrame({type:'selectMaps'}).setState({isRouteMode:false})
        const clearMaps = () => this.postMessageToIFrame({type:'clearMaps'})
        const clearRoute = () => this.postMessageToIFrame({type:'clearRoute', isRouteMode})
        const selectRouteMaps = () => this.postMessageToIFrame({type:'selectRouteMaps'})

        return [
            <FormGroup row={true} key='buttons'>
                <Label sm={2}/>
                <Col sm={8}>
                    <Navbar color='light' light={true} expand='md'>
                        <ButtonGroup>
                            <Button color='secondary' disabled={true}>Mode:</Button>
                            <Button color='primary' onClick={editRoute} active={isRouteMode}>
                                <span className='fa fa-draw-polygon'/> 
                                Edit Route
                            </Button>
                            <Button color='primary' onClick={selectMaps} active={!isRouteMode}>Select Maps</Button>
                        </ButtonGroup>
                        <Button color='primary' onClick={clearMaps} >Clear Maps</Button>
                        <Button color='primary' onClick={clearRoute} >Clear Route</Button>
                        <Button color='primary' onClick={selectRouteMaps} hidden={owner.getRoute().length < 3}>Select Route Maps</Button>
                        <Button color='primary' onClick={selectMaps} hidden={!this.state.isRouteMode}>Done</Button>
                        <Button color='secondary' disabled={true}>{owner.getMapSummary()}</Button>
                    </Navbar>
                </Col>
            </FormGroup>,
            <FormGroup row={true} key='mapgrid'>
                <Label sm={2}/>
                <Col sm={8}>
                    <iframe src={"data:text/html,"+encodeURIComponent(this.props.owner.props.app.state.mapPickerIframe)}
                            style={{width: '100%', height: 700}} id="map_picker_iframe"/>
                </Col>
            </FormGroup>
        ]
    }
}