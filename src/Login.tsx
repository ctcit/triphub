import { Component } from 'react'
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap'
import './index.css'
import { ConfigService } from './Services/ConfigService'

export class Login extends Component<{
    setPath: (path: string) => void
}, {
}> {
    constructor(props: any) {
        super(props)
        this.state = {
        }
    }

    public render() {

        const onClose = () => this.close()

        return (
            <Modal isOpen={true} toggle={onClose} 
                size="lg" style={{width: '95%', margin: '10px auto'}} centered={true}>
                <ModalHeader toggle={onClose}>Trips Login</ModalHeader>
                <ModalBody>
                    <iframe src={ConfigService.Config.loginUrl} 
                        title='Login' 
                        width='100%' height='500px' scrolling='no'>
                    </iframe>
                </ModalBody>
                <ModalFooter>
                    <Button color="primary" onClick={onClose}>Close</Button>
                </ModalFooter>
            </Modal>
        )
    }

    private close() {
        this.props.setPath('/')
        window.location.reload()
    }
}
