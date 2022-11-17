import { Component } from 'react'
import { ButtonGroup, Col, Container, FormText, Row } from 'reactstrap'
import { IDestination, IValidation, Role } from './Interfaces'
import './index.css'
import { BindMethods } from './Utilities'
import { DestinationsService } from './Services/DestinationsService'
import { ConfigService } from './Services/ConfigService'
import { FullWidthLoading } from './Widgets'
import Select, { ActionMeta } from 'react-select'
import { InputControl, InputWithSelectControl } from './Control'
import { MdAddBox, MdDelete } from 'react-icons/md'
import { ButtonWithConfirm } from './ButtonWithConfirm'
import { ButtonWithTooltip } from './ButtonWithTooltip'

export class ManageDestinations extends Component<{
    role: Role
}, {
    isLoading: boolean,
    destinations: IDestination[],
    destinationsByGroups: {[area: string]: {[to: string]: {[from: string]: IDestination}}},
    selectedOption: any,
    selectedDestination: IDestination | null
}> {

    constructor(props: any) {
        super(props)
        this.state = {
            isLoading: false,
            destinations: [],
            destinationsByGroups: {},
            selectedOption: null,
            selectedDestination: null
        }

        BindMethods(this)
    }

    private async requeryDestinations(): Promise<void> {
        this.setState({ isLoading: true })
        DestinationsService.getDestinations(true)
            .then((destinations: IDestination[]) => {
                const destinationsByGroups = this.getDestinationsByGroups(destinations)
                this.setState({ isLoading: false, destinations, destinationsByGroups })
            })
    }

    private getDestinationsByGroups(destinations: IDestination[]): {[area: string]: {[to: string]: {[from: string]: IDestination}}} {
        const destinationsByGroups: {[area: string]: {[to: string]: {[from: string]: IDestination}}} = {};
        destinations.forEach((destination: IDestination) => {
            if (!destinationsByGroups[destination.area]) {
                destinationsByGroups[destination.area] = {}
            }
            if (!destinationsByGroups[destination.area][destination.toLocation]) {
                destinationsByGroups[destination.area][destination.toLocation] = {}
            }
            destinationsByGroups[destination.area][destination.toLocation][destination.fromLocation] = destination
        })
        return destinationsByGroups
    }

    private setDestination(field: string, value: any, save: boolean = false): Promise<void> {
        if (this.state.selectedDestination && this.state.selectedOption) {
            this.state.selectedDestination[field] = value
            const d = this.state.selectedDestination
            this.state.selectedOption.label = this.makeLabel(d.toLocation, d.fromLocation, d.distance)
        }
        const destinationsByGroups = this.getDestinationsByGroups(this.state.destinations)

        if (save && this.state.selectedDestination) {
            const destinationWarnings = this.state.selectedDestination ? 
            DestinationsService.validateDestination(this.state.selectedDestination).filter(i => !i.ok) : []
            if (destinationWarnings.length === 0) {
                if (this.state.selectedDestination.id === 0) {
                    // new
                    return DestinationsService.postDestination(this.state.selectedDestination).then(newDestination => {
                        (this.state.selectedDestination as IDestination).id = newDestination.id
                        return this.requeryDestinations().then(() => {
                            this.setState({selectedOption: this.state.selectedOption, selectedDestination: this.state.selectedDestination })
                        })
                    })
                } else {
                    // update
                    return DestinationsService.patchDestination(this.state.selectedDestination.id, {[field]: value}).then(newDestination => {
                        this.setState({ destinations: this.state.destinations, destinationsByGroups })
                        return Promise.resolve()
                    })
                }
            } else {
                // warnings - don't save
                this.setState({selectedOption: this.state.selectedOption, selectedDestination: this.state.selectedDestination })
                return Promise.resolve()
            }

        } else {
            // no save
            this.setState({ destinations: this.state.destinations, destinationsByGroups })
            return Promise.resolve()
        }
    }

    private onNew() {
        const selectedDestination: IDestination = {
            id: 0,
            toLocation: '',
            fromLocation: '',
            area: '',
            distance: 0
        }
        const selectedOption = {
            label: '',
            value: selectedDestination
        }
        this.setState({ selectedOption, selectedDestination })
    }

    private onDelete() {
        if (this.state.selectedDestination) {
            DestinationsService.deleteDestination(this.state.selectedDestination.id).then(() => {
                this.setState({ selectedOption: null, selectedDestination: null })
                this.requeryDestinations()
            })
        }
    }

    private makeLabel(to: string, from: string, distance: number): string {
        return to + ' from ' + from + ' (' + distance + 'km)'        
    }

    public componentDidMount() {
        this.requeryDestinations()
    }

    public render() {

        const amAdmin = this.props.role >= Role.Admin

        const onDestinationChange = (newValue: any, actionMeta: ActionMeta<any>) => {
            this.setState({selectedOption: newValue, selectedDestination: newValue.value as IDestination})
        }

        const onGet = (field: string): any => this.state.selectedDestination ? this.state.selectedDestination[field] : null
        const onSet = (field: string, value: any): void => {
            this.setDestination(field, value);
        }
        const onSave = (field: string, value: any): Promise<any> => {
            return this.setDestination(field, value, true);
        }
        const destinationWarnings = this.state.selectedDestination ? 
            DestinationsService.validateDestination(this.state.selectedDestination).filter(i => !i.ok) : []
        const onGetValidationMessage = (field: string): any => {
            const found: IValidation | undefined = destinationWarnings.find(warning => warning.field === field)
            return found ? found.message : null
        }

        const groupedCommonDestinations = Object.entries(this.state.destinationsByGroups).map(([area, toValues]) => {
            return {
                label: area,
                options: Object.entries(toValues).flatMap(([to, fromValues]) => {
                    return Object.entries(fromValues).map(([from, destination]) => {
                        return {
                            value: destination,
                            label: this.makeLabel(to, from, destination.distance)
                        }
                    })
                })
            }
        })

        const areas = this.state.destinations
            .map(d => d.area)
            .filter((value, index, self) => self.indexOf(value) === index) // unique
        const fromLocations = this.state.destinations
            .map(d => d.fromLocation)
            .filter((value, index, self) => self.indexOf(value) === index) // unique

        const common = {
            id: 'destination',
            readOnly: !amAdmin,
            onGet, onSet, onSave, onGetValidationMessage
        }

        const onNew = () => this.onNew()
        const onDelete = () => this.onDelete()

        return [
            <Container className={ConfigService.containerClassName} key='managedestinations' fluid={true}>
                <Container fluid={true} >
                    <h1 key="title">Manage Destinations</h1>
                    {this.state.isLoading && <FullWidthLoading />}
                </Container>
                {!this.state.isLoading &&
                    <Container key='form' fluid={true}>
                        <Row>
                            <Col sm={9} md={9}>
                                <Select
                                    autoFocus={false}
                                    isMulti={false}
                                    isSearchable={true}
                                    options={groupedCommonDestinations}
                                    onChange={onDestinationChange}
                                    delimiter=','
                                    placeholder={'Start typing to select a destination'}
                                    isDisabled={false}
                                    styles={{ 
                                        control: (provided: any, state: any) => ({
                                            ...provided,
                                            flexWrap: 'nowrap'
                                        }),
                                        groupHeading: (provided: any, state: any) => ({
                                            ...provided, 
                                            backgroundColor: '#eeeeee',
                                            color: 'black',
                                            fontWeight: 'bold'
                                        })
                                    }}
                                    value={this.state.selectedOption}
                                />
                            </Col>
                            <Col sm={3} md={3}>
                                <ButtonGroup>
                                    <ButtonWithTooltip id="NewDestinationButton" color='secondary' 
                                        onClick={onNew} disabled={false} 
                                        placement="top" tooltipText="Create a new destination">
                                        <MdAddBox/>
                                    </ButtonWithTooltip>
                                    <ButtonWithConfirm id="DeleteDestinationButton" color='secondary' 
                                        onClick={onDelete} disabled={!this.state.selectedDestination?.id}  
                                        placement="top" tooltipText="Delete the selected destination"
                                        confirmText="Confirm delete">
                                        <MdDelete/>
                                    </ButtonWithConfirm>
                                </ButtonGroup>                                
                            </Col>
                        </Row>
                        {this.state.selectedDestination &&
                            <Container fluid={true}>
                                <Row>
                                    <Col sm={9} md={9}>
                                        <div className="alert alert-info" role="alert" hidden={destinationWarnings.length === 0} key='validation'>
                                            Destination will save automatically once all the following fields are entered correctly
                                        </div>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col sm={9} md={9}>
                                        <InputControl 
                                            field='toLocation' label='To location'
                                            type='text' hidden={false}
                                            {...common}
                                        />
                                    </Col>
                                </Row>
                                <Row>
                                    <Col sm={9} md={9}>
                                        <InputWithSelectControl 
                                            field='fromLocation' label='From location'
                                            type='text' hidden={false}
                                            options={fromLocations}
                                            {...common}
                                        />
                                    </Col>
                                </Row>
                                <Row>
                                    <Col sm={9} md={9}>
                                        <InputWithSelectControl 
                                            field='area' label='Area'
                                            type='text' hidden={false}
                                            options={areas}
                                            {...common}
                                        />
                                    </Col>
                                </Row>
                                <Row>
                                    <Col sm={9} md={9}>
                                        <InputControl 
                                            field='distance' label='Distance (km)'
                                            type='number' min={0} max={10000} step={1} hidden={false}
                                            {...common}
                                        />
                                    </Col>
                                </Row>
                            </Container>
                        }
                    </Container>
                }
                </Container>
            ]
    }

}
