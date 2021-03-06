configure :development do
  config[:protocol]      = 'http://'
  config[:host]          = '0.0.0.0'
  config[:port]          = 4567
  config[:css_dir]       = 'stylesheets'
  config[:js_dir]        = 'javascripts'
  config[:images_dir]    = 'images'
  config[:imgix_token]   = ENV['IMGIX_TOKEN']
  config[:imgix_domains] = ENV['IMGIX_DOMAIN']
  config[:app_version]   = 'v1'

  activate :sprockets
  activate :gzip
  activate :dotenv
  activate :autoprefixer do |config|
    config.browsers = ['last 1 version', 'last 3 safari versions', 'last 3 ios versions']
  end
end

configure :production do
  ignore 'svg/*'

  config[:protocol]      = 'https://'
  config[:host]          = 'www.gesteves.com/'
  config[:port]          = 80
  config[:css_dir]       = 'stylesheets'
  config[:js_dir]        = 'javascripts'
  config[:images_dir]    = 'images'
  config[:imgix_token]   = ENV['IMGIX_TOKEN']
  config[:imgix_domain]  = ENV['IMGIX_DOMAIN']
  config[:app_version]   = ENV['HEROKU_RELEASE_VERSION'] || 'v1'

  activate :sprockets
  activate :gzip
  activate :autoprefixer do |config|
    config.browsers = ['last 1 version', 'last 3 safari versions', 'last 3 ios versions']
  end
  activate :s3_sync do |s3|
    s3.prefer_gzip           = true
    s3.bucket                = ENV['AWS_BUCKET']
    s3.region                = ENV['AWS_REGION']
    s3.aws_access_key_id     = ENV['AWS_ACCESS_KEY_ID']
    s3.aws_secret_access_key = ENV['AWS_SECRET_ACCESS_KEY_ID']
  end
  activate :minify_css
  activate :asset_hash
  activate :relative_assets

  caching_policy 'text/html',    :max_age => ENV['MAX_AGE'] || 300, :must_revalidate => true
  default_caching_policy         :max_age => 60 * 60 * 24 * 365
end
