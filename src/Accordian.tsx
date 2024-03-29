import 'bootstrap/dist/css/bootstrap.min.css';
import { Component } from 'react';
import * as React from 'react';
import { Collapse, Card, CardHeader } from 'reactstrap';
import './index.css';
import { BindMethods } from './Utilities';

export class Accordian extends Component<{
    id: string
    expanded?: boolean
    cardClickExpand?: boolean
    title?: any
    className?: string
    headerClassName?: string
    children?: React.ReactNode
    onDemand?: () => JSX.Element | JSX.Element[]
}, {
    expanded: boolean
    demanded?: JSX.Element | JSX.Element[]
}> {
    constructor(props: any) {
        super(props)
        this.state = { expanded: props.expanded }
        BindMethods(this)
    }

    public onToggle() {
        this.setState({
            expanded: !this.state.expanded,
            demanded: this.state.demanded ?? (this.props.onDemand?.())
        })
    }

    public render() {
        const onToggle = () => this.onToggle();

        const { expanded, demanded } = this.state
        const { title, className, headerClassName, children, id, onDemand, cardClickExpand } = this.props
        const expandable = onDemand || children

        return (
            <Card className={'accordian ' + className + ' noprint'}>
                <CardHeader className={headerClassName + ' accordian-header'}
                    onClick={cardClickExpand === false ? undefined : this.onToggle}>
                    {expandable &&
                        <span className={'accordian-expand fa fa-chevron-' + (expanded ? 'up' : 'down')}
                            onClick={cardClickExpand === false ? this.onToggle : undefined} />}
                    {title}
                </CardHeader>
                <Collapse key={id} id={id} isOpen={expanded}>
                    {demanded ?? children}
                </Collapse>
            </Card>
        )
    }
}

