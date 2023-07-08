import { queue, axios, requeue } from 'requests/queue';
import { AxiosError } from 'axios';
import { IStore } from 'types';

const stage = (file: )stage ({
  data: {
    data: {
      stagedUploadsCreate: {
        stagedTargets: [
          target
        ]
      }
    }
  }
}: {
  data: {
    data: {
      stagedUploadsCreate:{
        stagedTargets: Array<{
          parameters: Array<{ name: string, value: string}>;
          url: string;
          resourceUrl: string;
        }>
      }
    }
  }
}) => {

  const form = new FormData();

  // Add each of the params we received from Shopify to the form. this will ensure our ajax request has the proper permissions and s3 location data.
  target.parameters.forEach(({ name, value }) => form.append(name, value));

  // Add the file to the form.
  form.append('file', file);

  // Post the file data to shopify's aws s3 bucket. After posting, we'll be able to use the resource url to create the file in Shopify.
  await axios.post(url, form, {
    headers: {
      ...form.getHeaders(), // Pass the headers generated by FormData library. It'll contain content-type: multipart/form-data. It's necessary to specify this when posting to aws.
      'Content-Length': fileSize + 5000 // AWS requires content length to be included in the headers. This may not be automatically passed so you'll need to specify. And ... add 5000 to ensure the upload works. Or else there will be an error saying the data isn't formatted properly.
    }
  });

}

export function upload (store: IStore, { filename, mimeType }: {
  filename: string;
  mimeType: string;
}) {

  return axios.post('/api/2022-01/graphql.json', {
    query: `mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets {
          resourceUrl
          url
          parameters {
            name
            value
          }
        }
        userErrors {
          field
          message
        }
      }
    }`,
    variables: {
      filename,
      mimeType,
      httpMethod: 'POST',
      resource: 'FILE'
    }
  }, store.client).then(stage);

}

/**
 * List Files
 *
 * Uses Graphql because Shopify is fucked.
 */
export async function list (store: IStore) {

  return axios.post('/api/2022-01/graphql.json', {
    query: `{
      files(first: 250) {
        edges {
          cursor
          node {
            ... on MediaImage {
              image {
                id,
                url,
                height,
                width
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
        }
      }
    }`
  }, store.client);

}

/* ------------------------
Download the file.
Good article on how to download a file and send with form data - https://maximorlov.com/send-a-file-with-axios-in-nodejs/
------------------------ */
const file = await fs.readFile('./your-image.jpg'); // This can be named whatever you'd like. You'll end up specifying the name when you upload the file to a staged target.
const fileSize = fs.statSync('./your-image.jpg').size; // Important to get the file size for future steps.

/* ------------------------
Create staged upload.
---
Shopify sets up temporary file targets in aws s3 buckets so we can host file data (images, videos, etc).
If you already have a public url for your image file then you can skip this step and pass the url directly to the create file endpoint.
But in many cases you'll want to first stage the upload on s3. Cases include generating a specific name for your image, uploading the image from a private server, etc.
------------------------ */
// Query
const stagedUploadsQuery = `mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
  stagedUploadsCreate(input: $input) {
    stagedTargets {
      resourceUrl
      url
      parameters {
        name
        value
      }
    }
    userErrors {
      field
      message
    }
  }
}`;

// Variables
const stagedUploadsVariables = {
  input: {
    filename: 'example.jpg',
    httpMethod: 'POST',
    mimeType: 'image/jpeg',
    resource: 'FILE' // Important to set this as FILE and not IMAGE. Or else when you try and create the file via Shopify's api there will be an error.
  }
};

// Result
const stagedUploadsQueryResult = await axios.post(
  `${your_shopify_admin_url}/graphql.json`,
  {
    query: stagedUploadsQuery,
    variables: stagedUploadsVariables
  },
  {
    headers: {
      'X-Shopify-Access-Token': `${your_shopify_admin_token}`
    }
  }
);

// Save the target info.
const target =
  stagedUploadsQueryResult.data.data.stagedUploadsCreate.stagedTargets[0];
const params = target.parameters; // Parameters contain all the sensitive info we'll need to interact with the aws bucket.
const url = target.url; // This is the url you'll use to post data to aws. It's a generic s3 url that when combined with the params sends your data to the right place.
const resourceUrl = target.resourceUrl; // This is the specific url that will contain your image data after you've uploaded the file to the aws staged target.

/* ------------------------
Post to temp target.
---
A temp target is a url hosted on Shopify's AWS servers.
------------------------ */
// Generate a form, add the necessary params and append the file.
// Must use the FormData library to create form data via the server.
const form = new FormData();

// Add each of the params we received from Shopify to the form. this will ensure our ajax request has the proper permissions and s3 location data.
params.forEach(({ name, value }) => {
  form.append(name, value);
});

// Add the file to the form.
form.append('file', file);

// Post the file data to shopify's aws s3 bucket. After posting, we'll be able to use the resource url to create the file in Shopify.
await axios.post(url, form, {
  headers: {
    ...form.getHeaders(), // Pass the headers generated by FormData library. It'll contain content-type: multipart/form-data. It's necessary to specify this when posting to aws.
    'Content-Length': fileSize + 5000 // AWS requires content length to be included in the headers. This may not be automatically passed so you'll need to specify. And ... add 5000 to ensure the upload works. Or else there will be an error saying the data isn't formatted properly.
  }
});

/* ------------------------
Create the file.
Now that the file is prepared and accessible on the staged target, use the resource url from aws to create the file.
------------------------ */
// Query
const createFileQuery = `mutation fileCreate($files: [FileCreateInput!]!) {
  fileCreate(files: $files) {
    files {
      alt
    }
    userErrors {
      field
      message
    }
  }
}`;

// Variables
const createFileVariables = {
  files: {
    alt: 'alt-tag',
    contentType: 'IMAGE',
    originalSource: resourceUrl // Pass the resource url we generated above as the original source. Shopify will do the work of parsing that url and adding it to files.
  }
};

// Finally post the file to shopify. It should appear in Settings > Files.
const createFileQueryResult = await axios.post(
  `${your_shopify_admin_url}/graphql.json`,
  {
    query: createFileQuery,
    variables: createFileVariables
  },
  {
    headers: {
      'X-Shopify-Access-Token': `${your_shopify_admin_token}`
    }
  }
);