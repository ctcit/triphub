export class ServiceWorkerUtilities {

    public static inServiceWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope

    public static triphubStackName: string = this.getTriphubStackName() 
    private static getTriphubStackName(): string {
        const path = (self as any)?.serviceWorker?.scriptURL || window.location.pathname
        const triphubStackNameRegex = /.*\/(triphub.*)\/web\/.*/
        const match = path.match(triphubStackNameRegex)
        const stackName = match ? match[1] : 'triphub'
        console.log((this.inServiceWorker? 'service worker' : 'app') + ' triphub stackName is ' + stackName)
        return stackName
    }
}