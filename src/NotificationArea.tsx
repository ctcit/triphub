import * as React from 'react';
import { useState } from 'react';
import { Alert, Container } from 'reactstrap';

export interface INotification {
    text: string,
    colour: string,
}

const Notification = (props: INotification): JSX.Element => {
    const [visible, setVisible] = useState(true)
    const onDismiss = () => setVisible(false)

    return <Alert color={props.colour} isOpen={visible} toggle={onDismiss}>
        {props.text}
    </Alert>
}


export interface INotificationAreaProps {
    notifications: INotification[],
    containerClassName: string
}

export const NotificationArea = (props: INotificationAreaProps): JSX.Element =>
    <Container className={props.containerClassName + 'my-3'} fluid={true}>
        {props.notifications.map((notification, index) => <Notification key={index} {...notification} />)}
    </Container>
