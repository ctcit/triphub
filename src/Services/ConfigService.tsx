import { BaseUrl } from '..';
import { IConfig } from '../Interfaces';
import { apiCall } from '../Utilities';

export class ConfigService {

    // offline GET supported
    public static async getConfig(force: boolean = false): Promise<IConfig> {
        if (force || !this.getConfigPromise) {
            this.getConfigPromise = new Promise<IConfig>((resolve, reject) => {
                apiCall('GET', BaseUrl + '/config')
                    .then((configs: IConfig[]) => {
                        this.config = configs[0];
                        resolve(this.config);
                    }, () => {
                        this.config = this.DefaultConfig;
                        resolve(this.config);
                    })
            });
        }
        return this.getConfigPromise;
    }

    public static get DefaultConfig(): IConfig {
        return {
            editRefreshInSec: 10,
            printLines: 25,
            calendarStartOfWeek: 1,
            prerequisiteEquipment: 'Ice Axe,Crampons,Helmet,Rope',
            prerequisiteSkills: 'Snow Skills,River Crossing',
        }
    }

    public static get Config(): IConfig {
        return this.config;
    }

    // public static get inIFrame() {
    //     return false // true if to style/behave for use in iFrame; false to style/behave as standalone app
    // }

    public static get containerClassName() {
        return "outer-container " // ConfigService.inIFrame ? "outer-container " : ""
    }


    private static getConfigPromise: Promise<IConfig> | undefined = undefined

    private static config: IConfig = ConfigService.DefaultConfig
  
}
