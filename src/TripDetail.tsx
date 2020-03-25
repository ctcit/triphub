import * as React from 'react';
import { Component } from 'react';
import { Form, Col, Row } from 'reactstrap';
import { App } from './App';
import { SwitchControl, TextAreaInputControl, InputControl } from './Control';
import './index.css';
import './print.css';
import { Trip } from './Trip';
import { IValidation, IMap, IArchivedRoute, ITrip } from './Interfaces';
import { MapControl } from './MapControl';
import { BaseUrl } from 'src';

export class TripDetail extends Component<{
        owner: Trip,
        app: App,
    },{
        editMap: boolean,
        editMaps: boolean,
        isSocialEvent: boolean
    }> {

      public href?: string
      public app: App

      private nz50MapsBySheet: { [mapSheet: string] : IMap } = {};
      private archivedRoutesById: { [archivedRouteId: string] : IArchivedRoute } = {};

      constructor(props: any){
        super(props)
        this.state = {
            editMap:false, 
            editMaps:false,
            isSocialEvent: false
        }
        this.href = this.props.owner.props.href
        this.app = this.props.app

        const nz50Maps: IMap[] = this.props.app.getMaps();
        this.nz50MapsBySheet = {};
        nz50Maps.forEach((nz50Map: IMap) => {
            this.nz50MapsBySheet[nz50Map.sheetCode] = nz50Map;
        });

        const archivedRoutes: IArchivedRoute[] = this.props.app.getArchivedRoutes();
        this.archivedRoutesById = {};
        archivedRoutes.forEach((archivedRoute: IArchivedRoute) => {
            this.archivedRoutesById[archivedRoute.id] = archivedRoute;
        });
    }

    public get(id: string) : any{
        return this.props.owner.state.trip[id]
    }

    public set(id: string, val: any) : void {
        this.props.owner.setState({ trip: {...this.props.owner.state.trip, [id]: val }})
    }

    public saveTrip(body: any): Promise<void> {
        return this.app.apiCall('POST', this.href as string, body, true);
    }

    public render(){
        const trip: ITrip = this.props.owner.state.trip;
        const validations: IValidation[] = this.app.validateTrip(this.props.owner.state.trip);

        // TODO Move to service
        const getArchivedRoute = (archivedRouteId: string): Promise<IArchivedRoute | undefined> =>  {
            return this.app.apiCall('GET', BaseUrl + '/routes/' + archivedRouteId )
                .then((response: IArchivedRoute[]) => response !== null && response.length > 0 ? response[0] : undefined);  
        }
        const updateArchivedRouteSummary = (archivedRouteId: string, routeSummary: string): Promise<void> =>  {
            return this.app.apiCall('PATCH', BaseUrl + '/routes/' + archivedRouteId, routeSummary );  
        }

        const onGet = (id: string): any => {
            return this.get(id);
        }
        const onSave = (id: string, value: any): Promise<void> => {
            this.set(id, value);
            const body = {};
            body[id] = value;
            return this.saveTrip(body);
        }
        const onGetValidationMessage = (id: string): any => {
            const found: IValidation | undefined = validations.find(validation => validation.id === id && !validation.ok);
            return found ? found.message : null;
        }

        const common = {
            readOnly: trip.id !== -1 && !this.props.owner.isPrivileged(), 
            owner: this,
            'onGet': onGet,
            'onSave': onSave,
            'onGetValidationMessage': onGetValidationMessage
        }

        return [
            <Form key='detail'>
                <Row noGutters={true}>
                    <Col>
                        <InputControl id='title' label='Title' type='text' {...common}/>
                    </Col>
                </Row>

                <Row noGutters={true}>
                    <Col md={3}>
                        <InputControl id='openDate' label='Open Date' type='date' {...common}/>
                    </Col>
                    <Col md={3}>
                        <InputControl id='closeDate' label='Close Date' type='date' {...common}/>
                    </Col>
                    <Col md={3}>
                        <InputControl id='tripDate' label='Trip Date' type='date' {...common}/>
                    </Col>
                </Row>

                <Row>
                    <Col md={2}>
                        <SwitchControl id='isSocial' label='Social event' {...common}/>
                    </Col>
                    <Col md={2}>
                        <SwitchControl id='isNoSignup' label='No sign up list' hidden={!trip.isSocial} {...common}/>
                    </Col>
                </Row>

                <Row>
                    <Col md={3}>
                        <InputControl id='length' label='Length in days'  type='number' min={0} hidden={trip.isSocial} {...common}/>
                    </Col>
                </Row>

                <Row>
                    <Col>
                        <InputControl id='departurePoint' label='Departure Point' type='text' list='departure_point_list' {...common}/>
                    </Col>
                </Row>

                <Row>
                    <Col>
                        <InputControl id='departureDetails' label='Departure Details' type='text' {...common}/>
                    </Col>
                </Row>

                <Row>
                    <Col md={3}>
                        <InputControl id='cost' label='Cost' type='text' {...common}/>
                    </Col>
                    <Col md={3}>
                        <InputControl id='grade' label='Grade' type='text' list='grade_list'  {...common}/>
                    </Col>
                </Row>

                <Row>
                <Col md={3}>
                        <SwitchControl id='isLimited' label='Limited Numbers' hidden={trip.isSocial && trip.isNoSignup} {...common}/>
                    </Col>
                    <Col md={3}>
                        <InputControl id='maxParticipants' label='Maximum trampers' type='number' min={0} hidden={!trip.isLimited || (trip.isSocial && trip.isNoSignup)} {...common}/>
                    </Col>
                </Row>

                <Row>
                    <Col>
                        <TextAreaInputControl id='description' label='Description' {...common}/>
                    </Col>
                </Row>

                <Row>
                    <Col>
                        <TextAreaInputControl id='logisticnfo' label='Logistic Information' {...common}/>
                    </Col>
                </Row>
    
                <Row>
                    <Col sm={10}>
                        <MapControl 
                            routesId='routes' routesLabel='Routes'
                            mapsId='maps' mapsLabel='Maps'
                            nz50MapsBySheet={this.nz50MapsBySheet} 
                            archivedRoutesById={this.archivedRoutesById}
                            getArchivedRoute={getArchivedRoute}
                            updateArchivedRouteSummary={updateArchivedRouteSummary}
                            {...common}
                        />
                    </Col>
                </Row>
            </Form>,
            <datalist key='grade_list' id='grade_list'>
                <option value='Easy' />
                <option value='Moderate' />
                <option value='Moderate/Hard' />
                <option value='Hard' />
            </datalist>,
            <datalist key='departure_point_list' id='departure_point_list'>
                <option value='Z Papanui' />
                <option value='Caltex Russley Road' />
            </datalist>
    ]
    }

}
