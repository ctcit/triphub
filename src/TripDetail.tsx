import * as React from 'react';
import { Component } from 'react';
import { Form, Col, Row, Container } from 'reactstrap';
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
        isLoading: boolean,
        forceValidation?: boolean,
    },{
        editMap: boolean,
        editMaps: boolean,
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

    public get(id: string) : any {
        return this.props.owner.state.trip[id]
    }

    public set(id: string, val: any) : void {
        // Use an update function rather than setting the value directly,
        // as setState is not guaranteed to execute immediately, so passing
        // the current value of state here leads to data loss if two sets get bunched
        this.props.owner.setState( (state) => {
            return {trip: {...state.trip, [id]: val}}
         })
    }

    public saveTrip(body: any): Promise<void> {
        if (this.href !== undefined) {
            return this.app.apiCall('POST', this.href as string, body, true);
        }
        else {
            return Promise.resolve()
        }
    }

    public render(){
        const trip: ITrip = this.props.owner.state.trip;
        const validations: IValidation[] = this.app.validateTrip(this.props.owner.state.trip);
        const isSocial = trip.isSocial

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

        const onGetInverted = (id: string): any => {
            return !this.get(id);
        }
        const onSaveInverted = (id: string, value: any): Promise<void> => {
            this.set(id, !value);
            const body = {};
            body[id] = !value;
            return this.saveTrip(body);
        }

        const common = {
            readOnly: trip.id !== -1 && !this.props.owner.canEditTrip(), 
            isLoading: this.props.isLoading,
            owner: this,
            forceValidation: this.props.forceValidation,
            'onGet': onGet,
            'onSave': onSave,
            'onGetValidationMessage': onGetValidationMessage
        }

        const commonInverted = {...common, 'onGet': onGetInverted, 'onSave': onSaveInverted }

        return [
            <Form key='detail' className="form">
                <Row>
                    <Col>
                        <InputControl id='title' label='Title' type='text' {...common}/>
                    </Col>
                </Row>

                <Row>
                    <Col sm={5} md={4}>
                        <InputControl id='tripDate' label={isSocial ? 'Social Date' : 'Trip Date'} type='date' {...common}/>
                    </Col>
                    <Col sm={5} md={4} hidden={isSocial}>
                        <InputControl id='length' label='Length in days'  type='number' min={0} hidden={trip.isSocial} {...common}/>
                    </Col>
                </Row>

                <Row>
                    <Col sm={2} md={3} hidden={!trip.isSocial}>
                        <SwitchControl id='isNoSignup' label='Sign up list' {...commonInverted}/>
                    </Col>
                    <Col sm={5} md={4} hidden={isSocial && trip.isNoSignup}>
                        <InputControl id='openDate' label='Open Date' type='date' helpText='When sign-up opens' {...common}/>
                    </Col>
                    <Col sm={5} md={4} hidden={isSocial && trip.isNoSignup}>
                        <InputControl id='closeDate' label='Close Date' type='date' helpText='When sign-up closes' {...common}/>
                    </Col>
                </Row>

                <Row>
                    <Col>
                        <InputControl id='departurePoint' 
                            label={isSocial ? 'Location' : 'Departure Point'} 
                            type='text'
                            list={isSocial ? 'social_location_list' : 'departure_point_list'} 
                            {...common}/>
                    </Col>
                </Row>

                <Row>
                    <Col>
                        <InputControl hidden={isSocial} id='departureDetails' label='Departure Details' type='text'
                            helpText='Time, any special arrangements' {...common}/>
                        <InputControl hidden={!isSocial} id='departureDetails' label='Time' type='text' helpText='Time, any special arrangements' {...common}/>
                    </Col>
                </Row>

                <Row>
                    <Col sm={4}>
                        <InputControl hidden={isSocial} id='cost' label='Cost' type='text' helpText='Estimated cost, including transport, huts etc' {...common}/>
                        <InputControl hidden={!isSocial} id='cost' label='Cost' type='text' helpText='Leave blank for free events' {...common}/>
                    </Col>
                    <Col sm={8}>
                        <InputControl id='grade' label='Grade' type='text' list='grade_list'  {...common}/>
                    </Col>
                </Row>

                <Row>
                    <Col sm={5} md={4}>
                        <SwitchControl id='isLimited' label='Limited Numbers' hidden={trip.isSocial && trip.isNoSignup} {...common}/>
                    </Col>
                    <Col sm={5} md={4}>
                        <InputControl id='maxParticipants' label={isSocial ? 'Maximum Atendees' : 'Maximum trampers'}
                        type='number' min={0} hidden={!trip.isLimited || (trip.isSocial && trip.isNoSignup)} {...common}/>
                    </Col>
                </Row>

                <Row>
                    <Col>
                        <TextAreaInputControl id='description' label='Description' {...common}/>
                    </Col>
                </Row>

                <Row>
                    <Col>
                        <TextAreaInputControl id='logisticnfo' label='Logistic Information'
                            helpText='Any additional information related to travel, accomodation etc' {...common}/>
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
                <option value='Easy/Moderate' />
                <option value='Moderate' />
                <option value='Moderate/Hard' />
                <option value='Hard' />
            </datalist>,
            <datalist key='departure_point_list' id='departure_point_list'>
                <option value='Z Papanui' />
                <option value='Z (formerly Caltex) Russley' />
            </datalist>,
            <datalist key='social_location_list' id='social_location_list'>
                <option value='Club Rooms (110 Walthan Road)' />
            </datalist>
    ]
    }

}
