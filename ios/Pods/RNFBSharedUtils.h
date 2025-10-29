/**
 * Copyright (c) 2016-present Invertase Limited & Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this library except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

#import <Foundation/Foundation.h>
#import <FirebaseCore/FirebaseCore.h>

// Forward declarations to avoid importing React headers in header file
@class RCTBridge;
typedef void (^RCTPromiseRejectBlock)(NSString *code, NSString *message, NSError *error);

extern NSString *const DEFAULT_APP_DISPLAY_NAME;
extern NSString *const DEFAULT_APP_NAME;

@interface RNFBSharedUtils : NSObject

+ (NSString *)getAppJavaScriptName:(NSString *)appDisplayName;
+ (NSDictionary *)firAppToDictionary:(FIRApp *)firApp;
+ (void)rejectPromiseWithExceptionDict:(RCTPromiseRejectBlock)reject
                             exception:(NSException *)exception;
+ (void)rejectPromiseWithNSError:(RCTPromiseRejectBlock)reject error:(NSError *)error;
+ (void)rejectPromiseWithUserInfo:(RCTPromiseRejectBlock)reject
                         userInfo:(NSMutableDictionary *)userInfo;
+ (void)sendJSEvent:(FIRApp *)app name:(NSString *)name body:(NSDictionary *)body;

@end