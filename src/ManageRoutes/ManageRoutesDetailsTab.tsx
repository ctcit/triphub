import * as L from 'leaflet';
import 'src/leaflet-editable/leaflet-editable.js';
import 'leaflet-gpx';
import * as React from 'react';
import { Col, Row, TabPane } from 'reactstrap';
import { Component } from 'react';
import { InputControl, TextAreaInputControl } from 'src/Control';
import { RouteDetails } from './ManageRoutesMap';

export class ManageRoutesDetailsTab extends Component<{
    isActiveTab: boolean,
    routeDetails: RouteDetails, 
    saveDetailsChange: (route: RouteDetails) => Promise<void>
},{
    activated: boolean,
    routeDetails: RouteDetails
}>{

    constructor(props:any) {
        super(props);

        this.state = {
            activated: false,
            routeDetails: props.routeDetails
        }
    }

    public render() {
        const self = this;

        const onGet = (id: string): any => (self.state.routeDetails as any)[id];
        const onSet = (id: string, value: any): void => self.setState(state => ({ routeDetails: { ...self.state.routeDetails, [id]: value } }));

        const onSave = (id: string, value: any): Promise<void> => {
            return this.props.saveDetailsChange(self.state.routeDetails);
        }

        const onGetValidationMessage = (id: string): string => {
            return "";
            // const found: IValidation | undefined = validations.find(validation => validation.id === id && !validation.ok);
            // return found ? found.message : null;
        }

        const common = {
            id: 'manageroutes',
            // readOnly: trip.id !== -1 && !this.props.owner.canEditTrip(), 
            isLoading: false,
            owner: this,
            // forceValidation: this.props.forceValidation,
            onGet,
            onSet,
            onSave,
            onGetValidationMessage
        }

        return (
            <TabPane tabId="Details">
                <Row>
                    <Col>
                        <InputControl field='title' label='Title' type='text' {...common}/>
                    </Col>
                </Row>

                <Row>
                    <Col>
                        <TextAreaInputControl field='description' label='Description' style={{minHeight: '350px'}} {...common}/>
                    </Col>
                </Row>

            </TabPane>
        );
    }

}

