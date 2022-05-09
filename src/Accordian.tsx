import 'bootstrap/dist/css/bootstrap.min.css';
import { Component } from 'react';
import * as React from 'react';
import { Collapse, Card, CardHeader } from 'reactstrap';
import './index.css';
import { BindMethods } from './Utilities';

export class Accordian extends Component<{
    id: string
    expanded?: boolean
    title?: any
    className?: string
    headerClassName?: string
    ondemand?: () => JSX.Element
}, {
    expanded: boolean
    demanded?: any
}> {
    constructor(props: any) {
        super(props)
        this.state = { expanded: props.expanded }
        BindMethods(this)
    }

    public onToggle() {
        this.setState({
            expanded: !this.state.expanded,
            demanded: this.state.demanded || (this.props.ondemand && this.props.ondemand())
        })
    }

    public render() {
        const onToggle = () => this.onToggle();

        return (
            <Card className={'accordian ' + this.props.className + ' noprint'}>
                <CardHeader className={this.props.headerClassName + ' accordian-header'} onClick={onToggle}>
                    <span className={'accordian-expand ' + (this.state.expanded ? 'fa fa-chevron-up' : 'fa fa-chevron-down')} />
                    {this.props.title}
                </CardHeader>
                <Collapse key={this.props.id} id={this.props.id} isOpen={this.state.expanded}>
                    {this.state.demanded || this.props.children}
                </Collapse>
            </Card>
        )
    }
}

