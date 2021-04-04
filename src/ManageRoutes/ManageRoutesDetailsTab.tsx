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
    activated: boolean
}>{
    constructor(props:any) {
        super(props);

        this.state = {
            activated: false,
        }
    }

    public render() {

        const onGet = (id: string): any => {
            return (this.props.routeDetails as any)[id];
        }

        const onSave = (id: string, value: any): Promise<void> => {
            const routeDetails: RouteDetails = this.props.routeDetails;
            (routeDetails as any)[id] = value;
            return this.props.saveDetailsChange(routeDetails);
        }

        const onGetValidationMessage = (id: string): any => {
            return null;
            // const found: IValidation | undefined = validations.find(validation => validation.id === id && !validation.ok);
            // return found ? found.message : null;
        }

        const common = {
            // readOnly: trip.id !== -1 && !this.props.owner.canEditTrip(), 
            isLoading: false,
            owner: this,
            // forceValidation: this.props.forceValidation,
            'onGet': onGet,
            'onSave': onSave,
            'onGetValidationMessage': onGetValidationMessage
        }

        return (
            <TabPane tabId="Details">
                <Row>
                    <Col>
                        <InputControl id='title' label='Title' type='text' {...common}/>
                    </Col>
                </Row>

                <Row>
                    <Col>
                        <TextAreaInputControl id='description' label='Description' style={{minHeight: '350px'}} rows={1} {...common}/>
                    </Col>
                </Row>

            </TabPane>
        );
    }

}

