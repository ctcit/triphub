import { Component } from 'react'
import { Col, Container, FormText, Row } from 'reactstrap'
import { IMileageRate, Role } from './Interfaces'
import './index.css'
import { BindMethods } from './Utilities'
import { MileageRatesService } from './Services/MileageRatesService'
import { ConfigService } from './Services/ConfigService'
import { InputControl } from './Control'
import { FullWidthLoading } from './Widgets'

export class ManageMileageRates extends Component<{
    role: Role
}, {
    isLoading: boolean,
    mileageRates: IMileageRate[]
}> {
    private engineSizeCCMax = 0
    private engineSizeCCTopRangeMin = 0

    constructor(props: any) {
        super(props)
        this.state = {
            isLoading: false,
            mileageRates: []
        }

        BindMethods(this)
    }

    public componentDidMount() {
        this.setState({ isLoading: true })

        MileageRatesService.getMileageRates()
            .then((mileageRates: IMileageRate[]) => {
                this.engineSizeCCMax = mileageRates.reduce((prev, mr2) => 
                    Math.max(mr2.engineSizeCC, prev), 0)
                this.engineSizeCCTopRangeMin = mileageRates.reduce((prev, mr2) => 
                    mr2.engineSizeCC < this.engineSizeCCMax ? Math.max(mr2.engineSizeCC, prev) : prev, 0)
        
                this.setState({ isLoading: false, mileageRates })
            })
    }

    public render() {

        const amAdmin = this.props.role >= Role.Admin

        const onGet = this.state.mileageRates.map(mr => {
            return ((field: string): any => (this.getMileageRate(mr.id) as any)[field])
        })
        const onSet = this.state.mileageRates.map(mr => {
            return (field: string, value: any): Promise<IMileageRate> => {
                const mr2: any = this.getMileageRate(mr.id)
                mr2[field] = value
                this.setState({ mileageRates: this.state.mileageRates })
                return Promise.resolve(mr2)
            }
        })
        const onSave = this.state.mileageRates.map(mr => {
            return (field: string, value: any): Promise<IMileageRate> => {
                (this.getMileageRate(mr.id) as any)[field] = value
                this.setState({ mileageRates: this.state.mileageRates })
                return MileageRatesService.patchMileageRate(mr.id, mr).then(mr2 => {
                    MileageRatesService.getMileageRates(true) // force update of cached rates
                    return mr
                })
            }
        })
        const onGetValidationMessage = (id: string) => ''

        return [
            <Container className={ConfigService.containerClassName} key='managemileagerates' fluid={true}>
                <Container fluid={true} >
                    <h1 key="title">Manage Mileage Rates</h1>
                    {this.state.isLoading && <FullWidthLoading />}
                </Container>
                {!this.state.isLoading &&
                    <Container key='form' fluid={true}>
                        <Row>
                            <FormText color='muted'>
                                Rates ($/ONE-WAY-km)
                            </FormText>
                        </Row>
                        {this.state.mileageRates.map((mr, index) => 
                            <Row key={'mileage-rate-row-' + mr.id}>
                                <Col sm={5} md={3}>
                                    <InputControl id={'mileage-rate-' + mr.id} 
                                        field='ratePerOneWayKm' label={this.getEngineSizeLabel(mr)}
                                        type='number' min={0} max={10.0} step={0.01} hidden={false} readOnly={!amAdmin}
                                        onGet={onGet[index]} onSet={onSet[index]} onSave={onSave[index]} 
                                        onGetValidationMessage={onGetValidationMessage}
                                    />
                                </Col>
                            </Row>
                            )
                        }
                    </Container>
                }
                </Container>
            ]
    }

    private getMileageRate(id: number): IMileageRate {
        const mr = this.state.mileageRates.find(mr2 => mr2.id === id)
        if (!mr) {
            throw('bad id: ' + id)
        }
        return mr
    }

    private getEngineSizeLabel(mr: IMileageRate): string {
        return 'Engine size ' + (mr.engineSizeCC < this.engineSizeCCMax ?
            '<= ' + mr.engineSizeCC + ' cc' :
            '> ' + this.engineSizeCCTopRangeMin + ' cc'
        )
    }

}
