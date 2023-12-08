import React from 'react';

import { DASHBOARD_HEADER_BRAND_LOGO, IS_CUSTOM_LOGO } from '../../config/ApplicationConfig';
import StyleConfig from '../../config/StyleConfig';
import { Typography } from '@neo4j-ndl/react';

await StyleConfig.getInstance();

export const NeoDashboardHeaderLogo = () => {
  const content = (
    <div
      className='n-items-center sm:n-flex md:n-flex-1 n-justify-start'
      onClick={() => window.open('/landing-page/', '_blank')}
    >
      {/* <a className='n-cursor-pointer'> */}
      <img className='n-h-10 n-w-auto n-m-2' src={'update-paths-tool-logo.png'} alt='Logo' />
      {/* </a> */}
      {/* {IS_CUSTOM_LOGO ? <></> : <Typography variant='h6'>Labs</Typography>} */}
    </div>
  );

  return content;
};

export default NeoDashboardHeaderLogo;
